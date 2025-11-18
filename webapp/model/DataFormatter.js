sap.ui.define([], function () {
    "use strict";

    return {
        flattenData: function (data) {
            if (!Array.isArray(data)) return [];

            return data.flatMap(header => {
                // --- 1. Base da linha (dados gerais do header) ---
                const baseRow = {
                    ZTPINT: header.ZTPINT,
                    ZBATCH: header.ZBATCH,
                    ZSTATUSDOC: header.ZSTATUSDOC,
                    //ZDTRECEBIMENTO: header.ZDTRECEBIMENTO || "",
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

                // --- 2. Separa itens do header (000000) e itens reais ---
                const headerItems = header.ITEM?.filter(i => i.ZITMNUM === "000000") || [];
                const itemRows = header.ITEM?.filter(i => i.ZITMNUM !== "000000") || [];

                // --- 3. Cria objeto com campos dos header items ---
                const headerValues = { ...baseRow };
                headerItems.forEach(item => {
                    const valor = item.ZVALOR;
                    switch (item.ZFIELD) {
                        case "DOC_DATE": headerValues.ZDTRECEBIMENTO = valor; break;
                        case "PSTNG_DATE": headerValues.PSTNG_DATE = valor; break; 
                        case "HEADER_TXT": headerValues.HEADER_TXT= valor; break;
                        case "REF_DOC_NO": headerValues.REF_DOC_NO = valor; break; 
                        case "GM_CODE": headerValues.GM_CODE = valor; break;                         
                        default: break;
                    }
                });

                // --- 4. Agrupa os itens por ZITMNUM ---
                const agrupados = {};
                itemRows.forEach(item => {
                    if (!agrupados[item.ZITMNUM]) {
                        agrupados[item.ZITMNUM] = [];
                    }
                    agrupados[item.ZITMNUM].push(item);
                });

                // --- 5. Criar uma linha por ZITMNUM 
                return Object.keys(agrupados).map(zitem => {
                    // Começa com os valores do header + headerItems
                    const linha = { ...headerValues, ZITMNUM: zitem };

                    agrupados[zitem].forEach(item => {
                        const valor = item.ZVALOR;
 
                        switch (item.ZFIELD) {
                            case "DOC_DATE": linha.ZDTRECEBIMENTO = valor; break;
                            case "BATCH": linha.BATCH= valor; break;
                            case "GM_CODE": linha.MOVIMENT = valor; break;
                            case "MATERIAL": linha.MATERIAL_CODE = valor; break;
                            case "QUANTITY": linha.QUANTITY = valor; break;
                            case "ENTRY_UOM": linha.UNIDADE = valor; break;
                            case "PLANT": linha.PLANT = valor; break;
                            case "GL_ACCOUNT": linha.GL_ACCOUNT = valor; break;
                            case "STGE_LOC": linha.DEPOSIT = valor; break;
                            case "SPLIT": linha.SPLIT = valor; break;
                            case "NFE_REFERENCE": linha.NFE_REFERENCE = valor; break; 
                            case "ZITMNUM":linha.ITMNUM = valor; break;

                            default: break;
                        }
                    });

                    return linha;
                });
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