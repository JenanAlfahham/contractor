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
    for item in doc.items:
        if item.is_group:
            latest_group += 1 
            item.series_number = latest_group
            latest_sub = 0

        else:
            latest_sub += 1
            item.series_number = str(latest_group) + "_" + str(latest_sub)


def set_rate_of_group_items(doc):
    """
    Set rate for the group items which equals 
    the total amount of its sub items
    """
    rates = {}
    for item in doc.items:
        if not item.is_group:
            group = int(item.series_number.split('_')[0])
            if not rates.get(group): rates[group] = 0

            rates[group] += item.amount

    for item in doc.items:
        if item.is_group:
            if not rates.get(item.series_number): continue
            item.rate = rates[item.series_number]
            item.amount = item.rate * item.qty

            item.base_rate = item.rate * doc.conversion_rate
            item.base_amount = item.amount * doc.conversion_rate


            