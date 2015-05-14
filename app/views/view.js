var Backbone = require('backbone');

var View = Backbone.View.extend({
    render: function viewRender () {
        this.$el.html(this.template(this.getRenderData()));
        this.afterRender();
        return this;
    },
    getRenderData: function viewGetRenderData () {
        return {};
    },
    afterRender: function viewAfterRender () {

    }
});

module.exports = View;
