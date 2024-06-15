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
				row.cost = self.total_cost / self.project_qty
				row.total_cost = self.total_cost
				row.boq_link = self.name
				break

		doc.save(ignore_permissions = True)