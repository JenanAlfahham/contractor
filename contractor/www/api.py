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
    group_item = None
    for item in doc.items:
        if item.is_group:
            latest_group += 1 
            item.series_number = latest_group
            latest_sub = 0
            group_item = item.item_code

        else:
            if latest_group == 0: continue
            latest_sub += 1
            item.series_number = str(latest_group) + "_" + str(latest_sub)

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
                rates[(item.group_item, group)] = 0

            rates[(item.group_item, group)] += item.amount
        elif item.series_number: 
            item.rate = item.base_rate = item.amount = item.base_amount = 0

    doc.group_items = []
    for group_item, group in rates:
        new_item = frappe._dict({
            "item_code": group_item,
            "item_name": frappe.db.get_value("Item", group_item, "item_name"),
            "rate": rates[(group_item, group)],
            "base_rate": rates[(group_item, group)] * doc.conversion_rate if doc.doctype == "Opportunity" else rates[(group_item, group)]
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
                "field_map": {"customer": "owners"},
            },
        },
        target_doc,
        set_missing_values,
    )
    return doc