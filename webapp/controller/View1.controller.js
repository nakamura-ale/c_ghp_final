sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "cghpfinal/model/formatter",
    "cghpfinal/model/ReprocessBuilder"
], (Controller, MessageToast, MessageBox, JSONModel, formatter, ReprocessBuilder) => {
    "use strict";

    return Controller.extend("cghpfinal.controller.View1", {
        formatter: formatter,

        onInit() {
            const today = new Date();

            const oFilterModel = new sap.ui.model.json.JSONModel({
                ZDTRECEBIMENTO_FROM: "",
                ZDTRECEBIMENTO_TO: today.toISOString().split("T")[0],
                ZTPINT: "10",
                ZBATCH: "",
                STATUS: ""

            });
            this.getView().setModel(oFilterModel, "filter");

            const oViewModel = new sap.ui.model.json.JSONModel({ data: [] });
            this.getView().setModel(oViewModel, "view");

            // 🔹 Novo modelo para guardar o JSON completo original
            const oRawModel = new sap.ui.model.json.JSONModel({ rawData: [] });
            this.getView().setModel(oRawModel, "raw");

            // 🔹 Adiciona lógica de bloqueio da seleção
            const oTable = this.byId("tblData");
            if (oTable) {
                oTable.attachRowSelectionChange(this.onRowSelectionChange, this);
            }
        },

        onSearch: function () {
            const oFilterData = this.getView().getModel("filter").getData();

            // 🔹 Extrai os parâmetros da tela
            const from = oFilterData.ZDTRECEBIMENTO_FROM || "";
            const to = oFilterData.ZDTRECEBIMENTO_TO || "";
            const batch = oFilterData.ZBATCH || "";
            const ztpint = oFilterData.ZTPINT || "";
            const status = oFilterData.STATUS || "RE"; // padrão se quiser



            // const baseUrl = "/mongo-compare/material-document-search?from=2025-06-01&to=2025-10-27&batch=P40710&status=RE&ztpint=10";

            const baseUrl = `/mongo-compare/material-document-search?` +
                `from=${from}&to=${to}&batch=${batch}&status=${status}&ztpint=${ztpint}`;

            console.log("🔍 URL montada:", baseUrl);

            fetch(baseUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    // 🔹 Guarda o JSON original completo
                    this.getView().getModel("raw").setProperty("/rawData", data);

                    // 🔹 Trata os dados para exibir na tabela
                    const treated = this._flattenData(data);
                    this.getView().getModel("view").setProperty("/data", treated);
                    if (!data || data.length === 0) {
                        this.getView().getModel("view").setProperty("/data", []);
                        sap.m.MessageToast.show("Nenhum dado encontrado para os filtros informados.");
                        return;
                    }

                    // 🔹 Após carregar os dados, aplicar o bloqueio visual
                    setTimeout(() => this.disableRestrictedRows(), 300);
                })
                .catch(err => {
                    console.error("Erro ao carregar API:", err);
                    MessageToast.show("Erro ao carregar dados da API externa.");
                });
        },

        _flattenData: function (data) {
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
                        case "DOC_DATE":
                            flattened.ZDTRECEBIMENTO = valor;
                            break;
                        case "GM_CODE":
                            flattened.MOVIMENT = valor;
                            break;
                        case "MATERIAL":
                            flattened.MATERIAL_CODE = valor;
                            break;
                        case "QUANTITY":
                            flattened.QUANTITY = valor;
                            break;
                        case "ENTRY_UOM":
                            flattened.UNIDADE = valor;
                            break;
                        case "PLANT":
                            flattened.PLANT = valor;
                            break;
                        case "GL_ACCOUNT":
                            flattened.GL_ACCOUNT = valor;
                            break;
                        case "STGE_LOC":
                            flattened.DEPOSIT = valor;
                            break;
                        case "SPLIT":
                            flattened.SPLIT = valor;
                            break;
                        case "NFE_REFERENCE":
                            flattened.NFE_REFERENCE = valor;
                            break;
                        default:
                            break;
                    }
                });

                return flattened;
            });
        },


        onReprocess: function () {
            const oTable = this.byId("tblData");

            const oViewModel = this.getView().getModel("view");
            const aViewData = oViewModel.getProperty("/data");
            const oRawModel = this.getView().getModel("raw");
            const aRawData = oRawModel.getProperty("/rawData");

            const selectedIndices = oTable.getSelectedIndices();

            if (selectedIndices.length === 0) {
                MessageToast.show("Selecione ao menos um item para reprocessar.");
                return;
            }

            const selectedItems = selectedIndices
                .map(i => aViewData[i])
                .filter(item => item.ZSTATUSDOC === "RE");

            if (selectedItems.length === 0) {
                MessageToast.show("Nenhum item com status ERR foi selecionado.");
                return;
            }

            const aToSend = [];


            selectedItems.forEach(linha => {
                const { ZTPINT, ZBATCH } = linha;
                const original = aRawData.find(obj => obj.ZTPINT === ZTPINT && obj.ZBATCH === ZBATCH);
                if (!original) return;

                // 🔹 Usa o builder separado
                const jsonFinal = ReprocessBuilder.buildReprocessJson(original);
                if (jsonFinal) aToSend.push(jsonFinal);
            });


            if (!aToSend.length) {
                sap.m.MessageToast.show("Nenhum dado válido para envio.");
                return;
            }


            fetch("/mongo-compare/reprocess", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(aToSend)
            })
                .then(res => {
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    return res.json();
                })
                .then(result => {
                    sap.m.MessageToast.show("Reprocessamento enviado com sucesso!");
                    console.log("Retorno da API:", result);
                })
                .catch(err => {
                    console.error("Erro no reprocessamento:", err);
                    sap.m.MessageBox.error("Falha ao enviar dados para reprocessamento.");
                });
        },


        // 🔹 BLOQUEIA LINHAS COM STATUS "RE"
        disableRestrictedRows() {
            const oTable = this.byId("tblData");
            const oModel = this.getView().getModel("view");
            const aData = oModel.getProperty("/data") || [];

            const aRows = oTable.getRows();
            aRows.forEach((row, index) => {
                const oCtx = row.getBindingContext("view");
                if (!oCtx) return;
                const item = oCtx.getObject();

                if (item.ZSTATUSDOC === "RE") {
                    const $row = row.$();
                    $row.addClass("rowDisabled");

                    // 🔹 Desativa o checkbox da linha (DOM direto)
                    const $checkbox = $row.find(".sapMCb"); // checkbox control
                    $checkbox.addClass("sapMCbDisabled"); // estilo SAP nativo de “disabled”
                    $checkbox.css({
                        "pointer-events": "none",
                        "opacity": "3.5"
                    });
                }
            });
        },

        // 🔹 EVITA SELEÇÃO DE LINHAS COM STATUS "RE"                                                                                                                                                                                                       
        onRowSelectionChange(oEvent) {
            const oTable = this.byId("tblData");
            const aIndices = oTable.getSelectedIndices();
            const oModel = this.getView().getModel("view");
            const aData = oModel.getProperty("/data");

            aIndices.forEach(index => {
                const item = aData[index];
                if (item && item.ZSTATUSDOC === "ERE") {
                    MessageToast.show("Linhas com status 'RE' não podem ser selecionadas.");
                    oTable.removeSelectionInterval(index, index);
                }
            });
        },
    });
});
