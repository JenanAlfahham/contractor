// Copyright (c) 2024, Jenan Alfahham and contributors
// For license information, please see license.txt

frappe.ui.form.on('Costing Note', {
	setup: function(frm){
		frm.set_query("party_type", function() {
			return{
				"filters": {
					"name": ["in", ["Customer", "Lead", "Prospect"]],
				}
			}
		});
		frm.set_query("item", "costing_note_items", function(doc, cdt, cdn) {
			let row = locals[cdt][cdn];
            return {
				filters: {
					is_group: row.is_group
				}
			}
		});
	},
	onload: function(frm){
		frm.trigger('setup_queries');
	},
	party_type: function(frm) {
		frm.trigger('setup_party_type');

		frm.set_value("party_name", "");
	},
	setup_party_type: function(frm) {
		frm.trigger('setup_queries');
		frm.trigger("set_dynamic_field_label");
	},
	set_dynamic_field_label: function(frm){
		if (frm.doc.party_type) {
			frm.set_df_property("party_name", "label", frm.doc.party_type);
		}
	},
	setup_queries: function(frm){
		if (frm.doc.party_type == "Lead") {
			frm.set_query('party_name', erpnext.queries['lead']);
		}
		else if (frm.doc.party_type == "Customer") {
			frm.set_query('party_name', erpnext.queries['customer']);
		} else if (frm.doc.party_type == "Prospect") {
			frm.set_query('party_name', function() {
				return {
					filters: {
						"company": me.frm.doc.company
					}
				};
			});
		}
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
                if (!group_item) group_item = i.item;

                ///Set thee Group Item of the Current Item
                i.group_item = group_item;
                break;
            }

            else {
                if (i.is_group){
                    latest_group = parseInt(i.series_number)
                    latest_sub = 0;
                    if (i.group_item) group_item = i.group_item;
                    else group_item = i.item;
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

frappe.ui.form.on('Costing Note Items', {
	boq: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.open_mapped_doc({
			method: "contractor.www.api.create_boq",
			frm: frm,
			args: {
				"item_row": row
			}
		})
	},
	cost: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.cost * row.qty);
	},
	total_cost: function(frm ,cdt, cdn){
		let row = locals[cdt][cdn];
		let total = row.total_cost + (row.total_cost * row.default_profit_margin / 100)
		frappe.model.set_value(cdt, cdn, "target_selling_price", total);
	},
	default_profit_margin: function(frm ,cdt, cdn){
		let row = locals[cdt][cdn];
		let total = row.total_cost + (row.total_cost * row.default_profit_margin / 100)
		frappe.model.set_value(cdt, cdn, "target_selling_price", total);
	},
	is_group: function(frm ,cdt, cdn){
        let row = locals[cdt][cdn];
        if (row.is_group && row.item) row.group_item = row.group_item;
        frm.events.set_series_number(frm, row)
    },
    item: function(frm, cdt, cdn){
        let row = locals[cdt][cdn];
        if (row.is_group) row.group_item = row.group_item;

		if (row.item){
			frappe.db.get_value("Item", row.item, ["stock_uom", "item_group"],
				(r) => {

					if (r) {
						frappe.model.set_value(cdt, cdn, "uom", r.stock_uom);
						frappe.model.set_value(cdt, cdn, "item_group", r.item_group);
					}
				}
			)
		}
		else {
			frappe.model.set_value(cdt, cdn, "uom", null);
			frappe.model.set_value(cdt, cdn, "item_group", null);
		}
		
    },
	qty: function(frm, cdt, cdn){
        let row = locals[cdt][cdn];
        if (row.rate){
            frappe.model.set_value(cdt, cdn, "total_cost", row.cost * row.qty);
        }
    },
});
