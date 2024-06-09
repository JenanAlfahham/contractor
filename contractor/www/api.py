import frappe

# Custom Validation for Opportunity
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
        elif not item.series_number: 
            item.rate = item.base_rate = item.amount = item.base_amount = 0

    doc.group_items = []
    for group_item, group in rates:
        new_item = frappe._dict({
            "item_code": group_item,
            "item_name": frappe.db.get_value("Item", group_item, "item_name"),
            "rate": rates[(group_item, group)],
            "base_rate": rates[(group_item, group)] * doc.conversion_rate
        })
        doc.append("group_items", new_item)

            