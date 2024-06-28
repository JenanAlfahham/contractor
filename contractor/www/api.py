import frappe
from frappe.utils import today  
from frappe.model.mapper import get_mapped_doc

# Custom Validation for Opportunity & Project
def validate(doc, method=None):
    set_series_number(doc)
    set_rate_of_group_items(doc)

def set_series_number(doc):
    """
    Set Series Number for each Item
    If item is an item group then the series would be like: '1, 2, 3...'
    If not then the series would be like: '1_1, 1_2, 2_1, 2_2....'
    """

    latest_group = 0
    latest_sub = 0
    item_group = None
    for item in doc.items:
        if item.is_group:
            latest_group += 1 
            item.series_number = latest_group
            latest_sub = 0
            item_group = item.item_group

        else:
            if latest_group == 0: continue
            latest_sub += 1
            item.series_number = str(latest_group) + "_" + str(latest_sub)

        item.item_group = item_group

def set_rate_of_group_items(doc):
    """
    Set rate for the group items which equals 
    the total amount of its sub items
    """
    rates = {}
    for item in doc.items:
        if not item.is_group and item.series_number:
            group = int(item.series_number.split('_')[0])

            if not rates.get((item.item_group, group)): 
                rates[(item.item_group, group)] = 0

            rates[(item.item_group, group)] += item.amount
        elif item.series_number: 
            item.rate = item.base_rate = item.amount = item.base_amount = 0

    doc.group_items = []
    for item_group, group in rates:
        new_item = frappe._dict({
            "item_group": item_group,
            "rate": rates[(item_group, group)],
            "base_rate": rates[(item_group, group)] * doc.conversion_rate if doc.doctype == "Opportunity" else rates[(item_group, group)]
        })
        doc.append("group_items", new_item)


@frappe.whitelist()
def make_project(source_name, target_doc=None):
	def postprocess(source, doc):
		doc.project_type = "External"
		doc.project_name = source.name

	doc = get_mapped_doc(
		"Sales Order",
		source_name,
		{
			"Sales Order": {
				"doctype": "Project",
				"validation": {"docstatus": ["=", 1]},
				"field_map": {
					"name": "sales_order",
					"base_grand_total": "estimated_costing",
					"net_total": "total_sales_amount",
				},
			},
            "Sales Order Item": {
				"doctype": "Project Item",
			},

		},
		target_doc,
		postprocess,
	)

	return doc

@frappe.whitelist()
def create_costing_note(source_name, target_doc=None):
    doc = get_mapped_doc(
        "Opportunity",
        source_name,
        {
            "Opportunity": {
                "doctype": "Costing Note",
                "field_map": {"name": "opportunity", "party_name": "customer"},
            },
            "Opportunity Item": {
                "doctype": "Costing Note Items",
                "field_map": {"item_code": "item", "amount": "target_selling_price"},
                "condition": lambda doc: not doc.is_group,
            },
            "Group Item": {
                "doctype": "Group Item"
            },
        },
        target_doc,
    )
    return doc


@frappe.whitelist()
def create_boq(source_name, target_doc=None):
    item = frappe.flags.args.item_row
    item = frappe._dict(item)
    def set_missing_values(source, target):
        target.naming_series = "BOQ-.YYYY.-"
        target.item_group = item.item_group
        target.item = item.item
        target.unit = item.uom
        target.project_qty = item.qty
        target.start_date = today()
        target.line_id = item.name

    doc = get_mapped_doc(
        "Costing Note",
        source_name,
        {
            "Costing Note": {
                "doctype": "BOQ",
                "field_map": {"customer": "owners"},
            },
        },
        target_doc,
        set_missing_values,
    )
    return doc

@frappe.whitelist()
def create_clearence(source_name, target_doc=None):

    def set_missing_values(source, target):
        if source.project:
            project = frappe.get_doc("Project", source.project)
            target.advance_payment_discount = project.advance_payment_discount
            target.business_guarantee_insurance_deduction_rate = project.business_guarantee_insurance_deduction_rate
        
        for item in source.items:
            if item.prevdoc_docname:
                if frappe.db.exists("Quotation", item.prevdoc_docname):
                    quotation = frappe.get_doc("Quotation", item.prevdoc_docname)
                    if quotation.opportunity:
                        target.opportunity = quotation.opportunity
                        
                break


    doclist = get_mapped_doc(
        "Sales Order",
        source_name,
        {
            "Sales Order": {
                "doctype": "Clearence", 
                "validation": {"docstatus": ["=", 1]},
                "field_map": {
                    "transaction_date": "posting_date",
                    "name": "sales_order"
                }
            },
            "Sales Order Item": {
                "doctype": "Clearence Item",
                "field_map": {
                    "parent": "sales_order",
                    "name": "so_detail",
                },
            },
            "Sales Taxes and Charges": {"doctype": "Sales Taxes and Charges", "add_if_empty": True},
        },
        target_doc,
        set_missing_values,
    )
    return doclist