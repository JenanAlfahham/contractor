frappe.ui.form.on("Item", {
    refresh: function(frm){
        frm.set_query("group_item", function(doc) {
            return {
				filters: {
					is_group: 1
				}
			}
		});
    }
})