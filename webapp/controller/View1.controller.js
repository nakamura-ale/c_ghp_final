sap.ui.define([
    "sap/ui/core/mvc/Controller", 
    "sap/m/MessageBox", 
    "cghpfinal/model/formatter", 
    "cghpfinal/model/Config",
    "cghpfinal/model/DataFormatter"
], (Controller,  MessageBox,  formatter, Config,DataFormatter) => {
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
 

            const USE_MOCK = true;
            if (USE_MOCK) {
                this._loadMockData();
                return;
            }

            const oFilterData = this.getView().getModel("filter").getData();

            // const baseUrl = "/mongo-compare/material-document-search?from=2025-06-01&to=2025-10-27&batch=P40710&status=RE&ztpint=10";

            //const baseUrl = `/mongo-compare/material-document-search?` +
            //    `from=${from}&to=${to}&batch=${batch}&status=${status}&ztpint=${ztpint}`;
            const baseUrl = Config.buildUrl("MATERIAL_SEARCH", {
                from:   oFilterData.ZDTRECEBIMENTO_FROM || "",
                to:     oFilterData.ZDTRECEBIMENTO_TO || "",
                batch:  oFilterData.ZBATCH || "",
                status: oFilterData.STATUS || "",
                ztpint: oFilterData.ZTPINT || ""
            });

            fetch(baseUrl)
                .then(res => {
                    if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
                    return res.json();
                })
                .then(data => {
                    // 🔹 Guarda o JSON original completo
                    this.getView().getModel("raw").setProperty("/rawData", data);

                    // 🔹 Trata os dados para exibir na tabela
                    const treated = DataFormatter.flattenData(data);
                    this.getView().getModel("view").setProperty("/data", treated);
                    if (!data || data.length === 0) {
                        this.getView().getModel("view").setProperty("/data", []);
                        MessageBox.error("Nenhum dado encontrado para os filtros informados.");
                        return;
                    }
 
                })
                .catch(err => {
                    console.error("Erro ao carregar API:", err);
                    MessageBox.show("Erro ao carregar dados da API externa.");
                });

        },



        // ------------------------------------------------------------------------- 
        //  Caminho do arquivo mockado (relativo à pasta webapp)
       // -------------------------------------------------------------------------
        _loadMockData: function () {
            const sMockPath = sap.ui.require.toUrl("cghpfinal/localService/mockdata/b1.json");
            // 🔹 Carrega o arquivo mock via JSONModel
            const oMockModel = new sap.ui.model.json.JSONModel(sMockPath);

            oMockModel.attachRequestCompleted(() => {
                const mockData = oMockModel.getData();

                // Guarda o JSON original completo
                //oRawModel.setProperty("/rawData", mockData);
                this.getView().getModel("raw").setProperty("/rawData", mockData);

                // Trata e exibe os dados
                const treated = DataFormatter.flattenData(mockData);
                this.getView().getModel("view").setProperty("/data", treated);
 
            });
        }, 

        // ------------------------------------------------------------------------- 
        //  Reprocessar itens selecionados
       // -------------------------------------------------------------------------
        onReprocess: function () {
            const oTable = this.byId("tblData");

            const oViewModel = this.getView().getModel("view");
            const aViewData = oViewModel.getProperty("/data");
            const oRawModel = this.getView().getModel("raw");
            const aRawData = oRawModel.getProperty("/rawData");

            const selectedIndices = oTable.getSelectedIndices();

            if (selectedIndices.length === 0) {
                MessageBox.error("Selecione ao menos um item para reprocessar.");
                return;
            }

            const selectedItems = selectedIndices
                .map(i => aViewData[i])
                .filter(item => item.ZSTATUSDOC === "RE");

            if (selectedItems.length === 0) {
                MessageBox.error("Nenhum item com status ERR foi selecionado.");
                return;
            }

            const aToSend = [];


            selectedItems.forEach(linha => {
                const { ZTPINT, ZBATCH } = linha;
                const original = aRawData.find(obj => obj.ZTPINT === ZTPINT && obj.ZBATCH === ZBATCH);
                if (!original) return;

                // 🔹 Usa o builder separado
                const jsonFinal = DataFormatter.buildReprocessJson(original);
                if (jsonFinal) aToSend.push(jsonFinal);
            });


            if (!aToSend.length) {
                MessageBox.error("Nenhum dado válido para envio.");
                return;
            }


            //               aToSend.forEach(item => {
            //        fetch("/mongo-compare/reprocess", {
            //            method: "POST",
            //           headers: { "Content-Type": "application/json" },
            //            body: JSON.stringify(item)
            //         }).catch(err => {
            //             // Loga, mas não interrompe o restante
            //             console.error("Falha ao enviar item:", err);
            //         });
            //          });


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
                    MessageBox.show("Reprocessamento enviado com sucesso!"); 
                })
                .catch(err => { 
                    MessageBox.error("Falha ao enviar dados para reprocessamento.");
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

                if (item.ZSTATUSDOC === "OK") {
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
                if (item && item.ZSTATUSDOC === "OK") {
                    MessageBox.show("Linhas com status 'OK' não podem ser selecionadas.");
                    oTable.removeSelectionInterval(index, index);
                }
            });
        },
    });
});
