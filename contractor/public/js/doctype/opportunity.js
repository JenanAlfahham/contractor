frappe.ui.form.on("Opportunity", {
    set_series_number: function(frm, row){
        let latest_group = 0;
        let latest_sub = 0;
        
        // Iterate through the items table to get the latest Group/Sub item
        for (let i of frm.doc.items){
            /// if we get to our index then add +1 to the previous group/sub item
            if (i.idx == row.idx){
                if (row.is_group) latest_group += 1;
                
                else {
                    latest_sub += 1;
                }

                break;
            }

            else {
                if (i.is_group){
                    latest_group = parseInt(i.series_number)
                    latest_sub = 0;
                }
                else {
                    [latest_group, latest_sub] = get_group_sub(i.series_number)
                }
            }
        }

        if (latest_group){
            if (row.is_group) row.series_number = latest_group;

            else row.series_number = latest_group + "_" + latest_sub;
        }
        frm.refresh_field("series_number");
    }
})
frappe.ui.form.on("Opportunity Item", {
    is_group: function(frm ,cdt, cdn){
        let row = locals[cdt][cdn];
        frm.events.set_series_number(frm, row)
    },
    items_add: function(frm ,cdt, cdn){
        frappe.model.set_value(cdt, cdn, "rate", 0.00);
        frappe.model.set_value(cdt, cdn, "base_rate", 0.00);
        frappe.model.set_value(cdt, cdn, "base_amount", 0.00);
    }
    
})

const get_group_sub = function(num_string){
    let numbers = num_string.match(/\d+/g); // Matches one or more consecutive digits
    return [parseInt(numbers[0]), parseInt(numbers[1])]
}