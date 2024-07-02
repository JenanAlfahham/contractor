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
	}
});
