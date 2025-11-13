sap.ui.define([], function () {
    "use strict";
// Para configurar os dados para selecao na URL
    return {
        API_BASE_URL: "/mongo-compare",

        ENDPOINTS: {
            MATERIAL_SEARCH: "/material-document-search",
            REPROCESS: "/reprocess"
        },

        DEFAULT_PARAMS: {
            from: "",
            to: "",
            batch: "",
            status: "",
            ztpint: ""
        },

        buildUrl: function (endpointKey, params = {}) {
            const base = this.API_BASE_URL + this.ENDPOINTS[endpointKey];
            const query = new URLSearchParams({ ...this.DEFAULT_PARAMS, ...params }).toString();
            return `${base}?${query}`;
        }
    };
});