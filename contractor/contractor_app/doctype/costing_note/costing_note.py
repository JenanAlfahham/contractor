# Copyright (c) 2024, Jenan Alfahham and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CostingNote(Document):
	def validate(self):
		self.update_prices_and_costs()

	def on_submit(self):
		self.update_opportunity()

	def update_prices_and_costs(self):
		rates = {}
		total_cost, total_amount, total_profit = 0, 0, 0
		for row in self.costing_note_items:
			if not row.is_group and row.series_number:
				group = int(row.series_number.split('_')[0])

				if not rates.get((row.group_item, group)): 
					rates[(row.group_item, group)] = 0

				rates[(row.group_item, group)] += row.target_selling_price
			
			row.total_cost = row.get("cost", 0) * row.qty
			row.target_selling_price = row.get("total_cost", 0) + (row.get("total_cost", 0) * row.get("default_profit_margin", 0) / 100)
			total_cost += row.total_cost
			total_amount += row.target_selling_price
			total_profit += row.target_selling_price - row.total_cost

		self.total_cost = total_cost
		self.total_target_selling_price = total_amount
		self.total_profit = total_profit
		self.profit_margin = self.total_profit / self.total_cost * 100 if self.total_cost else 0

		self.group_items = []
		for group_item, group in rates:
			new_item = frappe._dict({
				"item_code": group_item,
				"item_name": frappe.db.get_value("Item", group_item, "item_name"),
				"rate": rates[(group_item, group)]
			})
			self.append("group_items", new_item)

	def update_opportunity(self):
		if self.opportunity:
			opp = frappe.get_doc("Opportunity", self.opportunity)

			for row in self.costing_note_items:
				for item in opp.items:
					if item.item_code == row.item and\
					 item.series_number == row.series_number and\
					 item.group_item == row.group_item:

						item.rate = row.target_selling_price / row.qty
						item.amount = row.target_selling_price
						break

			opp.save(ignore_permissions=True)
