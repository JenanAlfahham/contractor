// Copyright (c) 2024, Jenan Alfahham and contributors
// For license information, please see license.txt

frappe.ui.form.on('Template BOQ', {
	// refresh: function(frm) {

	// }
});

frappe.ui.form.on('Material costs', {
	material_costs_add: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.qty = 1;
		row.depreciasion_percentage = 0;
		row.cost = 0;
		frm.refresh_field("material_costs")
	},
	qty: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	cost: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	}
});

frappe.ui.form.on('Labor costs', {
	labor_costs_add: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.qty = 1;
		row.cost = 0;
		frm.refresh_field("labor_costs")
	},
	qty: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	cost: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	item: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.db.get_value("Item", {"item_code": row.item}, "stock_uom", (r) => {
			if (r) {
				frappe.model.set_value(cdt, cdn, "uom", r.stock_uom);
			}
		})
	}
});
frappe.ui.form.on('Contractors table', {
	contractors_table_add: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.qty = 1;
		row.cost = 0;
		frm.refresh_field("contractors_table")
	},
	qty: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	cost: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	item: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.db.get_value("Item", {"item_code": row.item}, "stock_uom", (r) => {
			if (r) {
				frappe.model.set_value(cdt, cdn, "uom", r.stock_uom);
			}
		})
	}
});

frappe.ui.form.on('Expenses Table', {
	expenses_table_add: function(frm, cdt, cdn) {
		let row = locals[cdt][cdn];
		row.qty = 1;
		row.cost = 0;
		frm.refresh_field("expenses_table")
	},
	qty: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	cost: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.model.set_value(cdt, cdn, "total_cost", row.qty * row.cost);
	},
	item: function(frm, cdt, cdn){
		let row = locals[cdt][cdn];
		frappe.db.get_value("Item", {"item_code": row.item}, "stock_uom", (r) => {
			if (r) {
				frappe.model.set_value(cdt, cdn, "uom", r.stock_uom);
			}
		})
	}
});

