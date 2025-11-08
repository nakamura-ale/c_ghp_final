sap.ui.define([], function () {
    "use strict";

    return {
        /**
         * Formata data no padrão YYYYMMDD → YYYY.MM.DD
         */
        formatDate: function (value) {
            if (!value) return "";
            if (typeof value === "string" && value.length === 8) {
                const ano = value.substring(0, 4);
                const mes = value.substring(4, 6);
                const dia = value.substring(6, 8);
                return `${ano}.${mes}.${dia}`;
            }
            return value;  
        },
          formatTime: function (value) {
            if (!value) return "";
            if (typeof value === "string" && value.length === 6) {
                const hora = value.substring(0, 2);
                const min = value.substring(2, 4);
                const seg = value.substring(4, 6);
                return `${hora}:${min}:${seg}`;
            }
            return value; 
        }
    };
});