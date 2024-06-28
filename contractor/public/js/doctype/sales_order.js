
{% include 'erpnext/selling/doctype/sales_order/sales_order.js' %}

frappe.provide("contractor");
frappe.provide("contractor.selling");

contractor.selling.CustomSalesOrderController = class CustomSalesOrderController extends erpnext.selling.SalesOrderController {
    refresh(doc, dt, dn){
        var me = this;
		super.refresh(doc, dt, dn);
        cur_frm.remove_custom_button('Project', 'Create');
        if(flt(doc.per_delivered, 2) < 100) {
            this.frm.add_custom_button(__('Project'), () => this.make_project(), __('Create'));
        }
        if (this.frm.doc.docstatus == 1){
            me.frm.add_custom_button(__("Clearence"), () => {
                this.create_clearence();
            }, __('Create'))
        }
    }
    make_project() {
		frappe.model.open_mapped_doc({
			method: "contractor.www.api.make_project",
			frm: this.frm
		})
	}
    create_clearence(){
        frappe.model.open_mapped_doc({
			method: "contractor.www.api.create_clearence",
			frm: this.frm
		})
    }
}

extend_cscript(cur_frm.cscript, new contractor.selling.CustomSalesOrderController({frm: cur_frm}));
