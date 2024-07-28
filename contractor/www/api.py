import frappe
from frappe.utils import today, flt
from frappe.model.mapper import get_mapped_doc

from contractor.contractor_app.doctype.boq.boq import set_boq_template

# Custom Validation for Opportunity, Quotation, Sales Order & Project
def validate(doc, method=None):
    set_series_number(doc)
    set_rate_of_group_items(doc)
    if doc.doctype == "Project" or doc.doctype == "Sales Order":
        set_qtys(doc)

def on_update_after_submit(doc, method=None):
    if doc.doctype == "Sales Order":
        set_qtys(doc)

def set_series_number(doc):
    """
    Set Series Number for each Item
    If item is an item group then the series would be like: '1, 2, 3...'
    If not then the series would be like: '1_1, 1_2, 2_1, 2_2....'
    """

    latest_group = 0
    latest_sub = 0
    group_item = None
    for item in doc.items:
        if item.is_group:
            latest_group += 1 
            if not item.series_number: item.series_number = latest_group
            latest_sub = 0
            if item.group_item: 
                group_item = item.group_item
            else: group_item = item.item_code

        else:
            if latest_group == 0: continue
            latest_sub += 1
            if not item.series_number: item.series_number = str(latest_group) + "_" + str(latest_sub)

        item.group_item = group_item

def set_rate_of_group_items(doc):
    """
    Set rate for the group items which equals 
    the total amount of its sub items
    """
    rates = {}
    for item in doc.items:
        if not item.is_group and item.series_number:
            group = int(item.series_number.split('_')[0])

            if not rates.get((item.group_item, group)): 
                rates[(item.group_item, group)] = [0, 0]

            rates[(item.group_item, group)][0] += flt(item.amount)
            rates[(item.group_item, group)][1] += flt(item.qty)
        
        elif item.series_number: 
            item.rate = item.base_rate = item.amount = item.base_amount = 0

    doc.group_items = []
    for group_item, group in rates:
        new_item = frappe._dict({
            "group_item": group_item,
            "rate": rates[(group_item, group)][0],
            "base_rate": rates[(group_item, group)][0] * doc.conversion_rate if doc.doctype == "Opportunity" else rates[(group_item, group)][0],
            "qty": rates[(group_item, group)][1],
            "completed_qty": 0,
            "completion_percentage": 0
        })
        doc.append("group_items", new_item)

def set_qtys(doc):
    if doc.doctype == "Project":
        cleas = frappe.db.get_all("Clearence", {"project": doc.name, "docstatus": 1}, "name")
    elif doc.doctype == "Sales Order":
        cleas = frappe.db.get_all("Clearence", {"sales_order": doc.name, "docstatus": 1}, "name")
    
    groups = {}
    for clea in cleas:
        d = frappe.get_doc("Clearence", clea.name)
        for item in d.items:
            if item.is_group: continue

            if not groups.get(item.group_item):
                groups[item.group_item] = 0

            groups[item.group_item] += item.qty

    for parent in doc.group_items:
        if groups.get(parent.group_item):
            parent.completed_qty = groups[parent.group_item]
            parent.completion_percentage = parent.completed_qty / parent.qty * 100

            frappe.db.set_value("Group Item", parent.name, "completed_qty", parent.completed_qty)
            frappe.db.set_value("Group Item", parent.name, "completion_percentage", parent.completion_percentage)



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
                    "grand_total": "project_amount",
                    "base_grand_total": "base_project_amount"
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
                "field_map": {"name": "opportunity", "opportunity_from": "party_type"},
            },
            "Opportunity Item": {
                "doctype": "Costing Note Items",
                "field_map": {"item_code": "item", "amount": "target_selling_price"},
                #"condition": lambda doc: not doc.is_group,
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
        target.group_item = item.group_item
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
            },
        },
        target_doc,
        set_missing_values,
    )

    return doc

@frappe.whitelist()
def create_clearence(source_name, target_doc=None):

    def set_missing_values(source, target):
        target.advance_payment_discount = source.advance_payment_discount
        target.business_guarantee_insurance_deduction_rate = source.business_guarantee_insurance_deduction_rate
        
        if source.project:
            project = frappe.get_doc("Project", source.project)
            if not target.advance_payment_discount: target.advance_payment_discount = project.advance_payment_discount
            if not target.business_guarantee_insurance_deduction_rate: target.business_guarantee_insurance_deduction_rate = project.business_guarantee_insurance_deduction_rate
            target.contract_date = project.date

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
                    "name": "sales_order",
                    "delivery_date": "delivery_date"
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