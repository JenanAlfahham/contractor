
frappe.ui.form.on("Quotation", {
    refresh: function(frm){
        frm.set_query("item_code", "items", function(doc, cdt, cdn) {
            let row = locals[cdt][cdn];
            if (row.is_group == 1){
                return {
                    filters: {
                        is_group: row.is_group
                    }
                }
            }
            else {
                return {
                    filters: {
                        group_item: row.parent_group
                    }
                }
            }
        });        
    },
    set_series_number: function(frm, row){
        let latest_group = 0;
        let latest_sub = 0;
        let group_item = null;
        
        // Iterate through the items table to get the latest Group/Sub item
        for (let i of frm.doc.items){
            /// if we get to our index then add +1 to the previous group/sub item
            if (i.idx == row.idx){
                if (row.is_group) latest_group += 1;
                
                else {
                    latest_sub += 1;
                }
                ///Set the Group Item to be the First Group Item Row
                if (!group_item) group_item = i.item_code;

                ///Set thee Group Item of the Current Item
                i.group_item = group_item;
                break;
            }

            else {
                if (i.is_group){
                    latest_group = parseInt(i.series_number)
                    latest_sub = 0;
                    if (i.group_item) group_item = i.group_item;
                    else group_item = i.item_code;
                }
                else if (i.series_number) {
                    [latest_group, latest_sub] = get_group_sub(i.series_number)
                }
            }
        }

        if (latest_group){
            if (row.is_group) row.series_number = latest_group;

            else row.series_number = latest_group + "_" + latest_sub;
        }
        frm.refresh_field("items");
    }
})

frappe.ui.form.on("Quotation Item", {
    items_add: function(frm, cdt, cdn){
        let row = locals[cdt][cdn];
        const index = frm.doc.items.length - 2;
        if (index < 0) return
        row.parent_group = frm.doc.items[index].parent_group;
    },
    is_group: function(frm ,cdt, cdn){
        let row = locals[cdt][cdn];
        if (row.is_group && row.item_code) {
            row.group_item = row.item_code;
            row.parent_group = row.item_code;
        }
        else {
            const index = frm.doc.items.length - 2;
            if (index < 0) return
            row.parent_group = frm.doc.items[index].parent_group;
        }
        frm.events.set_series_number(frm, row)

    },
    item_code: function(frm, cdt, cdn){
        let row = locals[cdt][cdn];
        if (row.is_group == 1) {
            row.group_item = row.item_code;
            row.parent_group = row.item_code
        }
        else {
            const index = frm.doc.items.length - 2;
            if (index < 0) return
            row.parent_group = frm.doc.items[index].parent_group;
        }
    }
    
})

const get_group_sub = function(num_string){
    let numbers = num_string.match(/\d+/g); // Matches one or more consecutive digits
    return [parseInt(numbers[0]), parseInt(numbers[1])]
}