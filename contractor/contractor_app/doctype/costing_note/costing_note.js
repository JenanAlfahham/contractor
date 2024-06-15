// Copyright (c) 2024, Jenan Alfahham and contributors
// For license information, please see license.txt

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
