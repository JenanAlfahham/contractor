// Copyright (c) 2024, Contractor and contributors
// For license information, please see license.txt

{% include 'erpnext/selling/sales_common.js' %}
frappe.provide("contractor");

contractor.ClearenceController = class ClearenceController extends erpnext.selling.SellingController {
	setup(doc) {
		this.setup_posting_date_time_check();
		super.setup(doc);
	}
	items_add(doc, cdt, cdn) {
		var row = frappe.get_doc(cdt, cdn);
		this.frm.script_manager.copy_from_first_row("items", row, ["income_account", "discount_account", "cost_center"]);
	}
	items_on_form_rendered() {
		erpnext.setup_serial_or_batch_no();
	}
	customer() {
		var me = this;
		if(this.frm.updating_party_details) return;

		if (this.frm.doc.__onload && this.frm.doc.__onload.load_after_mapping) return;

		erpnext.utils.get_party_details(this.frm,
			"erpnext.accounts.party.get_party_details", {
				posting_date: this.frm.doc.posting_date,
				party: this.frm.doc.customer,
				party_type: "Customer",
				price_list: this.frm.doc.selling_price_list
			}, function() {
				me.apply_pricing_rule();
			});

	}
	
}

cur_frm.set_query("income_account", "items", function(doc) {
	return{
		query: "erpnext.controllers.queries.get_income_account",
		filters: {'company': doc.company}
	}
});

// Cost Center in Details Table
// -----------------------------
cur_frm.fields_dict["items"].grid.get_field("cost_center").get_query = function(doc) {
	return {
		filters: {
			'company': doc.company,
			"is_group": 0
		}
	}
}

extend_cscript(cur_frm.cscript, new contractor.ClearenceController({frm: cur_frm}));


cur_frm.cscript.income_account = function(doc, cdt, cdn) {
	erpnext.utils.copy_value_in_all_rows(doc, cdt, cdn, "items", "income_account");
}

cur_frm.cscript.expense_account = function(doc, cdt, cdn) {
	erpnext.utils.copy_value_in_all_rows(doc, cdt, cdn, "items", "expense_account");
}

cur_frm.cscript.cost_center = function(doc, cdt, cdn) {
	erpnext.utils.copy_value_in_all_rows(doc, cdt, cdn, "items", "cost_center");
}
frappe.ui.form.on('Clearence', {
	setup: function(frm){
		frm.add_fetch('customer', 'tax_id', 'tax_id');

		frm.set_query('company_address', function(doc) {
			if(!doc.company) {
				frappe.throw(__('Please set Company'));
			}

			return {
				query: 'frappe.contacts.doctype.address.address.address_query',
				filters: {
					link_doctype: 'Company',
					link_name: doc.company
				}
			};
		});

		// discount account
		frm.fields_dict['items'].grid.get_field('discount_account').get_query = function(doc) {
			return {
				filters: {
					'report_type': 'Profit and Loss',
					'company': doc.company,
					"is_group": 0
				}
			}
		}

		frm.fields_dict['items'].grid.get_field('deferred_revenue_account').get_query = function(doc) {
			return {
				filters: {
					'root_type': 'Liability',
					'company': doc.company,
					"is_group": 0
				}
			}
		}
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
	company: function(frm){
		if (frm.doc.company) {
			frappe.call({
				method: "erpnext.setup.doctype.company.company.get_default_company_address",
				args: {name:frm.doc.company, existing_address: frm.doc.company_address || ""},
				debounce: 2000,
				callback: function(r){
					if (r.message){
						frm.set_value("company_address",r.message)
					}
					else {
						frm.set_value("company_address","")
					}
				}
			})
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
		
});


frappe.ui.form.on('Clearence Item', {
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
    },
	qty_percentage: function(frm, cdt, cdn){
		const row = locals[cdt][cdn];
		if (row.qty){
			frappe.model.set_value(cdt, cdn, "qty", row.qty_percentage * row.qty / 100);
		}
	},
	// qty: function(frm, cdt, cdn){
	// 	const row = locals[cdt][cdn];
	// 	if (row.rate){
	// 		frappe.model.set_value(cdt, cdn, "amount", row.qty * row.rate);
	// 	}
	// },
	// rate: function(frm ,cdt, cdn){
	// 	const row = locals[cdt][cdn];
	// 	if (row.qty){
	// 		frappe.model.set_value(cdt, cdn, "amount", row.qty * row.rate);
	// 	}
	// },
	// amountW: function(frm ,cdt, cdn){
	// 	const row = locals[cdt][cdn];
	// 	let total = 0
	// 	for (let item of frm.doc.items){

	// 	}
	// }
});
