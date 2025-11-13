sap.ui.define([], function () {
    "use strict";

    return {
        flattenData: function (data) {
            if (!Array.isArray(data)) return [];

            return data.map(header => {
                const flattened = {
                    ZTPINT: header.ZTPINT,
                    ZBATCH: header.ZBATCH,
                    ZSTATUSDOC: header.ZSTATUSDOC,
                    ZDTRECEBIMENTO: header.ZDTRECEBIMENTO || "",
                    ZMSG: header.ZMSG || "",
                    MATERIAL_CODE: "",
                    QUANTITY: "",
                    UNIDADE: "",
                    PLANT: "",
                    TIME: header.ZHORA || "",
                    GL_ACCOUNT: "",
                    NFE_REFERENCE: header.ZDOCNUM || "",
                    MOVIMENT: "",
                    DEPOSIT: "",
                    SPLIT: ""
                };

                header.ITEM?.forEach(item => {
                    const valor = item.ZVALOR;
                    switch (item.ZFIELD) {
                        case "DOC_DATE": flattened.ZDTRECEBIMENTO = valor; break;
                        case "GM_CODE": flattened.MOVIMENT = valor; break;
                        case "MATERIAL": flattened.MATERIAL_CODE = valor; break;
                        case "QUANTITY": flattened.QUANTITY = valor; break;
                        case "ENTRY_UOM": flattened.UNIDADE = valor; break;
                        case "PLANT": flattened.PLANT = valor; break;
                        case "GL_ACCOUNT": flattened.GL_ACCOUNT = valor; break;
                        case "STGE_LOC": flattened.DEPOSIT = valor; break;
                        case "SPLIT": flattened.SPLIT = valor; break;
                        case "NFE_REFERENCE": flattened.NFE_REFERENCE = valor; break;
                        default: break;
                    }
                });

                return flattened;
            });
        },
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