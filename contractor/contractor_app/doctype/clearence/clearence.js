// Copyright (c) 2024, Contractor and contributors
// For license information, please see license.txt

frappe.provide("contractor");

cur_frm.cscript.tax_table = "Sales Taxes and Charges";

erpnext.accounts.taxes.setup_tax_filters("Sales Taxes and Charges");
erpnext.sales_common.setup_selling_controller();

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
		
});


frappe.ui.form.on('Clearence Item', {
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
