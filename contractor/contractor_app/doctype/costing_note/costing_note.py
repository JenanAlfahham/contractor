# Copyright (c) 2024, Jenan Alfahham and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document

class CostingNote(Document):
	def validate(self):
		self.update_prices_and_costs()

	def on_submit(self):
		self.update_linked_doc()

	def on_cancel(self):
		if self.opportunity:
			doc = frappe.get_doc("Opprtunity", self.opportunity)
			for row in self.costing_note_items:
				for item in doc.items:
					if item.item_code == row.item and (item.group_item == row.group_item or (not row.group_item and not item.group_item)):
						if item.rate <= row.target_selling_price:
							item.rate -= row.target_selling_price
						else: item.rate = 0
						break
			doc.save(ignore_permissions=True)

		elif self.sales_order:
			doc = frappe.get_doc("Sales Order", self.sales_order)
			for row in self.costing_note_items:
				for item in doc.items:
					if item.item_code == row.item and (item.group_item == row.group_item or (not row.group_item and not item.group_item)):
						if item.rate <= row.target_selling_price:
							item.rate -= row.target_selling_price
						else: item.rate = 0
						break
			doc.save(ignore_permissions=True)


	def update_prices_and_costs(self):
		rates = {}
		total_cost, total_amount, total_profit = 0, 0, 0
		for row in self.costing_note_items:
			if not row.is_group and row.series_number and row.group_item:
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
				"group_item": group_item,
				"rate": rates[(group_item, group)]
			})
			self.append("group_items", new_item)

	def update_linked_doc(self):
		if self.opportunity:
			opp = frappe.get_doc("Opportunity", self.opportunity)

			for row in self.costing_note_items:
				if row.item == "Unknown" or row.item == "Unknown Group":
					frappe.throw("Row {}: No Correct Item Code is Set".format(row.idx))

				for item in opp.items:
					if (item.item_description == row.item_description and\
					 item.series_number == row.series_number) or\
					 (not row.group_item and not item.group_item and not item.item_description and not row.item_description):
						item.item_code = row.item
						item.group_item = row.group_item
						item.item_group = row.item_group
						item.uom = row.uom
						item.item_name = frappe.db.get_value("Item", row.item, "item_name")
						item.description = frappe.db.get_value("Item", row.item, "description")
						item.rate = row.target_selling_price / row.qty
						item.amount = row.target_selling_price
						break

			opp.save(ignore_permissions=True)
		
		elif self.sales_order:
			so = frappe.get_doc("Sales Order", self.sales_order)

			for row in self.costing_note_items:
				if row.item == "Unknown" or row.item == "Unknown Group":
					frappe.throw("Row {}: No Correct Item Code is Set".format(row.idx))

				for item in so.items:
					# if (item.item_description == row.item_description and\
					#  item.series_number == row.series_number) or\
					#  item.item_code == row.item_code and item.group_item == row.group_item:
					if item.item_code == row.item and item.group_item == row.group_item or (not row.group_item and not item.group_item):
						# item.item_code = row.item
						# item.group_item = row.group_item
						# item.item_group = row.item_group
						# item.uom = row.uom
						# item.item_name = frappe.db.get_value("Item", row.item, "item_name")
						# item.description = frappe.db.get_value("Item", row.item, "description")
						item.rate = row.target_selling_price / row.qty
						item.amount = row.target_selling_price
						break
			
			so.save(ignore_permissions=True)
