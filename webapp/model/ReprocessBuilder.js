sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Monta o JSON simplificado para reprocessamento.
         * @param {Object} original - Objeto original completo.
         * @returns {Object} JSON no formato esperado pela API.
         */
        buildReprocessJson: function (original) {
            if (!original) return null;

            return {
                ZTPINT: original.ZTPINT,
                ZBATCH: original.ZBATCH,
                ZDTRECEBIMENTO: original.ZDTRECEBIMENTO?.replaceAll("-", "") || "",
                ZHORA: original.ZHORA?.replaceAll(":", "") || "", 
                ITEM: (original.ITEM || []).map(it => ({
                    ZTPINT: it.ZTPINT,
                    ZBATCH: it.ZBATCH,
                    ZPARAMETRO: it.ZPARAMETRO,
                    ZITMNUM: it.ZITMNUM,
                    ZFIELD: it.ZFIELD,
                    ZVALOR: it.ZVALOR
                }))
            };
        }
    };
});