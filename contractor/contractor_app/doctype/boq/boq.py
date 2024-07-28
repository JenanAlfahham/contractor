# Copyright (c) 2024, Jenan Alfahham and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class BOQ(Document):
	def validate(self):
		tables = ["material_costs", "labor_costs", "contractors_table", "expenses_table"]

		for table in tables:
			total = 0
			for item in self.get(table):
				total += item.get("cost") * item.qty

			if table == "contractors_table":
				self.total_contractors = total
			elif table == "expenses_table":
				self.total_expenses = total
			elif table == "material_costs":
				self.total_material_costs = total
			else:
				self.total_labor_costs = total

		
		self.total_cost = self.get("total_material_costs", 0) + self.get("total_labor_costs", 0) + self.get("total_contractors", 0) + self.get("total_expenses", 0)

	def on_submit(self):
		if not self.costing_note or not self.line_id:
			frappe.throw("The BOQ has no Costing Note as a Reference")

		doc = frappe.get_doc("Costing Note", self.costing_note)
		for row in doc.costing_note_items:
			if row.name == self.line_id:
				row.item = self.item
				row.cost = self.total_cost / self.project_qty
				row.total_cost = self.total_cost
				row.boq_link = self.name
				break

		doc.save(ignore_permissions = True)

	def on_cancel(self):
		doc = frappe.get_doc("Costing Note", self.costing_note)
		for row in doc.costing_note_items:
			if row.name == self.line_id:
				row.cost = 0
				row.total_cost = 0
				row.target_selling_price = 0
				row.boq_link = None

				break

		doc.save(ignore_permissions = True)


@frappe.whitelist()
def set_boq_template(boq_template):

	if not frappe.db.exists("Template BOQ", boq_template): return

	tables = {}

	temp = frappe.get_doc("Template BOQ", boq_template)

	for table in ["material_costs", "labor_costs", "contractors_table", "expenses_table"]:
		if temp.get(table):
			
			tables[table] = []

			for row in temp.get(table):
				item = frappe._dict({
					"cost": row.get("cost", 0),
					"qty": row.get("qty", 0), 
					"item": row.item,
					"total_cost": row.get("total_cost", 0)
				})
				if table == "material_costs": item["depreciasion_percentage"] = row.get("depreciasion_percentage")
				else: item["uom"] = row.uom

				tables[table].append(item)

	return tables

