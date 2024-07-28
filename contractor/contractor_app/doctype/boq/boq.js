// Copyright (c) 2024, Jenan Alfahham and contributors
// For license information, please see license.txt

frappe.ui.form.on('BOQ', {
	setup: function(frm){
		frm.set_query("party_type", function() {
			return{
				"filters": {
					"name": ["in", ["Customer", "Lead", "Prospect"]],
				}
			}
		});
		frm.set_query("boq_template", function() {
			return{
				"filters": {
					"item_code": frm.doc.item,
				}
			}
		});
	},
	onload: function(frm){
		frm.trigger('setup_queries');
	},
	boq_template: function(frm){
		if (frm.doc.item && frm.doc.boq_template){
			frappe.call({
				"method": "contractor.contractor_app.doctype.boq.boq.set_boq_template",
				"args": {
					"boq_template": frm.doc.boq_template,
					"doc": frm.doc
				},
				callback: function(r){
					if (r.message) {
						frm.clear_table("material_costs");
						frm.clear_table("labor_costs");
						frm.clear_table("contractors_table");
						frm.clear_table("expenses_table");
						let keys = Object.keys(r.message);

						for (const table of keys){
							for (const row of r.message[table]){
								let c = frm.add_child(table);
								c.cost = row.cost;
								c.item = row.item;
								c.qty = row.qty;
								c.total_cost = row.total_cost;

								if (table == "material_costs") c.depreciasion_percentage = row.depreciasion_percentage;

								else c.uom = row.uom
							}
							
							frm.refresh_field(table)

						}

					}
				}
			})
		}
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
