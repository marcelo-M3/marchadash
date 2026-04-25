var SHEETS = {
  BASE_CLIENTES: "BASE_CLIENTES"
};

function doGet() {
  var payload = buildDashboardPayload_();
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function buildDashboardPayload_() {
  var baseClientes = getSheetData_(SHEETS.BASE_CLIENTES);
  var hoje = new Date();

  var clientesAtivosValidos = baseClientes.filter(function (row) {
    return normalizeText_(getAtivo_(row)) === "sim" && normalizeSaude_(getSaude_(row)) !== "";
  });

  var statusCounts = { bons: 0, alerta: 0, critico: 0 };
  var ltvValoresAtivos = [];

  clientesAtivosValidos.forEach(function (row) {
    var saude = normalizeSaude_(getSaude_(row));
    if (saude === "bom") statusCounts.bons += 1;
    if (saude === "alerta") statusCounts.alerta += 1;
    if (saude === "critico") statusCounts.critico += 1;

    var ltv = resolveLtvMeses_(row, hoje);
    if (ltv !== null) ltvValoresAtivos.push(ltv);
  });

  var evolucaoMensal = buildEvolucaoMensalFromBase_(baseClientes, hoje);
  var churnLookup = {};
  evolucaoMensal.forEach(function (item) {
    churnLookup[item.key] = {
      churn: item.churn,
      parcial: item.parcial
    };
  });

  var churnFechado = evolucaoMensal
    .filter(function (item) {
      return item.parcial === false && item.churn !== null;
    })
    .map(function (item) {
      return item.churn;
    });

  var clientesAtivos = clientesAtivosValidos.length;
  var percBons = percent_(statusCounts.bons, clientesAtivos);
  var percAlerta = percent_(statusCounts.alerta, clientesAtivos);
  var percCritico = percent_(statusCounts.critico, clientesAtivos);
  var atualizadoEm = Utilities.formatDate(hoje, Session.getScriptTimeZone(), "dd/MM/yyyy");
  var baseMesRecente = evolucaoMensal.length
    ? evolucaoMensal[evolucaoMensal.length - 1].base_inicio
    : 0;
  var variacaoBase =
    baseMesRecente > 0
      ? round_(((clientesAtivos - baseMesRecente) / baseMesRecente) * 100, 1)
      : 0;

  return {
    atualizado_em: atualizadoEm,
    clientes_ativos: clientesAtivos,
    clientes_bons: statusCounts.bons,
    clientes_alerta: statusCounts.alerta,
    clientes_critico: statusCounts.critico,
    perc_bons: percBons,
    perc_alerta: percAlerta,
    perc_critico: percCritico,
    ltv_medio: average_(ltvValoresAtivos),
    ltv_mediana: median_(ltvValoresAtivos),
    taxa_sucesso: percBons,
    churn_medio: average_(churnFechado),
    variacao_base: variacaoBase,
    por_gestor: buildPorGestor_(clientesAtivosValidos, hoje),
    evolucao_mensal: evolucaoMensal.map(function (item) {
      return {
        mes: item.label,
        base_inicio: item.base_inicio,
        entradas: item.entradas,
        saidas: item.saidas,
        churn: item.churn,
        parcial: item.parcial
      };
    }),
    saidas_por_mes: buildSaidasPorMesFromBase_(baseClientes, churnLookup, evolucaoMensal),
    clientes_detalhados: buildClientesDetalhados_(clientesAtivosValidos, hoje)
  };
}

function buildPorGestor_(rows, hoje) {
  var grouped = {};

  rows.forEach(function (row) {
    var gestor = normalizeDisplayText_(getField_(row, ["GESTOR"])) || "Sem gestor";
    var saude = normalizeSaude_(getSaude_(row));

    if (!grouped[gestor]) {
      grouped[gestor] = {
        nome: gestor,
        bons: 0,
        alerta: 0,
        critico: 0,
        ltvValores: []
      };
    }

    if (saude === "bom") grouped[gestor].bons += 1;
    if (saude === "alerta") grouped[gestor].alerta += 1;
    if (saude === "critico") grouped[gestor].critico += 1;

    var ltv = resolveLtvMeses_(row, hoje);
    if (ltv !== null) grouped[gestor].ltvValores.push(ltv);
  });

  return Object.keys(grouped)
    .map(function (nome) {
      var item = grouped[nome];
      var total = item.bons + item.alerta + item.critico;
      return {
        nome: item.nome,
        bons: item.bons,
        alerta: item.alerta,
        critico: item.critico,
        taxa_sucesso: percent_(item.bons, total),
        ltv_medio: average_(item.ltvValores)
      };
    })
    .sort(function (a, b) {
      return b.taxa_sucesso - a.taxa_sucesso;
    });
}

function buildEvolucaoMensalFromBase_(rows, hoje) {
  var movimentos = rows
    .map(function (row) {
      return {
        entryDate: resolveEntryDate_(row),
        exitDate: resolveExitDate_(row)
      };
    })
    .filter(function (item) {
      return item.entryDate !== null;
    });

  if (!movimentos.length) return [];

  var startMonth = startOfMonth_(getMinDate_(movimentos.map(function (item) {
    return item.entryDate;
  })));

  var latestKnownDate = getMaxDate_(
    movimentos
      .reduce(function (acc, item) {
        acc.push(item.entryDate);
        if (item.exitDate) acc.push(item.exitDate);
        return acc;
      }, [])
      .concat([hoje])
  );

  var endMonth = startOfMonth_(latestKnownDate);
  var cursor = new Date(startMonth.getTime());
  var parsed = [];
  var currentMonthKey = buildMonthKey_(hoje.getFullYear(), hoje.getMonth() + 1);

  while (cursor.getTime() <= endMonth.getTime()) {
    var monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    var nextMonth = addMonths_(monthStart, 1);
    var monthEnd = new Date(nextMonth.getTime() - 1);

    var entradas = 0;
    var saidas = 0;
    var baseInicio = 0;

    movimentos.forEach(function (item) {
      if (item.entryDate && item.entryDate >= monthStart && item.entryDate < nextMonth) {
        entradas += 1;
      }

      if (item.exitDate && item.exitDate >= monthStart && item.exitDate < nextMonth) {
        saidas += 1;
      }

      var entrouAntesDoMes = item.entryDate < monthStart;
      var naoSaiuAntesDoMes = !item.exitDate || item.exitDate >= monthStart;
      if (entrouAntesDoMes && naoSaiuAntesDoMes) {
        baseInicio += 1;
      }
    });

    var key = buildMonthKey_(monthStart.getFullYear(), monthStart.getMonth() + 1);
    var parcial = key === currentMonthKey;

    parsed.push({
      ano: monthStart.getFullYear(),
      mesNumero: monthStart.getMonth() + 1,
      mesNome: monthLabel_(monthStart.getMonth() + 1),
      key: key,
      label: "",
      base_inicio: baseInicio,
      entradas: entradas,
      saidas: saidas,
      churn: parcial || !baseInicio ? null : round_((saidas / baseInicio) * 100, 2),
      parcial: parcial,
      date: monthStart,
      monthEnd: monthEnd
    });

    cursor = nextMonth;
  }

  var includeYear = hasMultipleYears_(parsed);

  return parsed.map(function (item) {
    item.label = includeYear ? item.mesNome + "/" + item.ano : item.mesNome;
    return item;
  });
}

function buildSaidasPorMesFromBase_(rows, churnLookup, evolucaoMensal) {
  var includeYear = hasMultipleYears_(
    evolucaoMensal.map(function (item) {
      var parts = item.key.split("-");
      return { ano: Number(parts[0]) };
    })
  );

  var grouped = {};

  rows.forEach(function (row) {
    var nomeCliente = normalizeDisplayText_(getField_(row, ["CLIENTES"]));
    if (!nomeCliente) return;

    var exitDate = resolveExitDate_(row);
    if (!exitDate) return;

    var mesNumero = exitDate.getMonth() + 1;
    var ano = exitDate.getFullYear();
    var key = buildMonthKey_(ano, mesNumero);

    if (!grouped[key]) {
      grouped[key] = {
        ano: ano,
        mesNumero: mesNumero,
        mesNome: monthLabel_(mesNumero),
        clientes: [],
        churn: churnLookup[key] ? churnLookup[key].churn : null,
        parcial: churnLookup[key] ? churnLookup[key].parcial : false
      };
    }

    grouped[key].clientes.push(nomeCliente);
  });

  return Object.keys(grouped)
    .map(function (key) {
      var item = grouped[key];
      return {
        sortKey: key,
        mes: includeYear ? item.mesNome + "/" + item.ano : item.mesNome,
        churn: item.churn,
        parcial: item.parcial,
        clientes: item.clientes.sort()
      };
    })
    .sort(function (a, b) {
      return a.sortKey.localeCompare(b.sortKey);
    })
    .map(function (item) {
      return {
        mes: item.mes,
        churn: item.churn,
        parcial: item.parcial,
        clientes: item.clientes
      };
    });
}

function buildClientesDetalhados_(rows, hoje) {
  return rows
    .map(function (row) {
      var status = normalizeSaude_(getSaude_(row));
      var nome = normalizeDisplayText_(getField_(row, ["CLIENTES"]));

      if (!nome || !status) return null;

      return {
        nome: nome,
        gestor: normalizeDisplayText_(getField_(row, ["GESTOR"])) || "Sem gestor",
        origem: normalizeDisplayText_(getField_(row, ["ORIGEM"])) || null,
        status: status,
        status_label: statusLabel_(status),
        data_inicio: formatDateForPayload_(parseDate_(getField_(row, ["DATA PLANEJAMENTO"]))),
        ltv_meses: resolveLtvMeses_(row, hoje)
      };
    })
    .filter(Boolean)
    .sort(function (a, b) {
      if (a.status === b.status) {
        return a.nome.localeCompare(b.nome);
      }

      return a.status.localeCompare(b.status);
    });
}

function resolveLtvMeses_(row, hoje) {
  var periodo = getField_(row, ["PERÍODO"]);
  if (periodo !== "" && periodo !== null && periodo !== undefined) {
    var periodoNumero = Number(periodo);
    if (!isNaN(periodoNumero) && periodoNumero > 0) {
      return round_(periodoNumero, 1);
    }
  }

  var inicio = parseDate_(getField_(row, ["DATA PLANEJAMENTO"]));
  if (!inicio) return null;

  var fim = parseDate_(getField_(row, ["SAÍDA CLIENTE"])) || hoje;
  return diffInMonths_(inicio, fim);
}

function resolveEntryDate_(row) {
  var monthDate = parseMonthYear_(getField_(row, ["M/A ENTRADA"]));
  if (monthDate) return monthDate;
  return parseDate_(getField_(row, ["DATA PLANEJAMENTO"]));
}

function resolveExitDate_(row) {
  var monthDate = parseMonthYear_(getField_(row, ["M/A SAÍDA"]));
  if (monthDate) return monthDate;
  return parseDate_(getField_(row, ["SAÍDA CLIENTE"]));
}

function getSheetData_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
  if (!sheet) {
    throw new Error('A aba "' + sheetName + '" não foi encontrada.');
  }

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  var headers = values[0].map(function (header) {
    return String(header).trim();
  });

  return values.slice(1).reduce(function (acc, row) {
    var empty = row.every(function (cell) {
      return cell === "" || cell === null;
    });
    if (empty) return acc;

    var item = {};
    headers.forEach(function (header, index) {
      item[header] = row[index];
    });
    acc.push(item);
    return acc;
  }, []);
}

function getField_(row, possibleKeys) {
  for (var i = 0; i < possibleKeys.length; i += 1) {
    var key = possibleKeys[i];
    if (Object.prototype.hasOwnProperty.call(row, key)) {
      return row[key];
    }
  }
  return "";
}

function getSaude_(row) {
  return getField_(row, ["STATUS CLIENTE", "Saúde cliente"]);
}

function getAtivo_(row) {
  return getField_(row, ["ATIVO"]);
}

function normalizeSaude_(value) {
  var normalized = normalizeText_(value);
  if (normalized === "bom") return "bom";
  if (normalized === "precisa de atencao") return "alerta";
  if (normalized === "situacao critica") return "critico";
  return "";
}

function normalizeText_(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeDisplayText_(value) {
  return String(value || "").trim();
}

function statusLabel_(value) {
  if (value === "bom") return "Bom";
  if (value === "alerta") return "Precisa de Atenção";
  if (value === "critico") return "Situação Crítica";
  return "";
}

function parseDate_(value) {
  if (!value) return null;
  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value;
  }

  var text = String(value).trim();
  var br = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  }

  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseMonthYear_(value) {
  if (!value) return null;

  var text = String(value).trim();
  var match = text.match(/^(\d{1,2})\/(\d{2,4})$/);
  if (!match) return null;

  var month = Number(match[1]);
  var year = Number(match[2]);
  if (!month || month < 1 || month > 12) return null;
  if (year < 100) year += 2000;

  return new Date(year, month - 1, 1);
}

function formatDateForPayload_(date) {
  if (!date) return null;
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yyyy");
}

function diffInMonths_(startDate, endDate) {
  var years = endDate.getFullYear() - startDate.getFullYear();
  var months = endDate.getMonth() - startDate.getMonth();
  var total = years * 12 + months;
  var dayFactor = (endDate.getDate() - startDate.getDate()) / 30;
  return round_(Math.max(total + dayFactor, 0), 1);
}

function average_(values) {
  if (!values || !values.length) return 0;
  var sum = values.reduce(function (acc, value) {
    return acc + value;
  }, 0);
  return round_(sum / values.length, 1);
}

function median_(values) {
  if (!values || !values.length) return 0;
  var sorted = values.slice().sort(function (a, b) {
    return a - b;
  });
  var middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return round_((sorted[middle - 1] + sorted[middle]) / 2, 1);
  }
  return round_(sorted[middle], 1);
}

function percent_(value, total) {
  if (!total) return 0;
  return round_((value / total) * 100, 1);
}

function round_(value, decimals) {
  var factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

function monthLabel_(monthNumber) {
  var labels = [
    "",
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
  ];
  return labels[monthNumber] || "Mês";
}

function buildMonthKey_(year, monthNumber) {
  return String(year) + "-" + ("0" + monthNumber).slice(-2);
}

function hasMultipleYears_(rows) {
  var set = {};
  rows.forEach(function (row) {
    if (row.ano) set[row.ano] = true;
  });
  return Object.keys(set).length > 1;
}

function startOfMonth_(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths_(date, amount) {
  return new Date(date.getFullYear(), date.getMonth() + amount, 1);
}

function getMinDate_(dates) {
  return dates.reduce(function (current, date) {
    return date.getTime() < current.getTime() ? date : current;
  });
}

function getMaxDate_(dates) {
  return dates.reduce(function (current, date) {
    return date.getTime() > current.getTime() ? date : current;
  });
}
