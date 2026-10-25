
const stocks = {
  "005930": "삼성전자",
  "000660": "SK하이닉스",
  "005380": "현대차",
  "105560": "KB금융",
  "035420": "NAVER",
  "035720": "카카오"
};

export default async function handler(request) {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*"
  };

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code") || "005930";

    if (!Object.hasOwn(stocks, code)) {
      return Response.json(
        { error: "지원하지 않는 종목입니다." },
        { status: 400, headers }
      );
    }

    const apiUrl =
      `https://aikstockdata.com/data/public/s/${code}_history.json`;

    const response = await fetch(apiUrl, {
      signal: AbortSignal.timeout(12000)
    });

    if (!response.ok) {
      throw new Error(
        `주가 데이터 서버 오류: ${response.status}`
      );
    }

    const data = await response.json();

    const columns = data.columns;
    const rows = data.rows;

    if (!Array.isArray(columns) || !Array.isArray(rows)) {
      throw new Error("주가 데이터 형식이 올바르지 않습니다.");
    }

    const index = Object.fromEntries(
      columns.map((name, i) => [name, i])
    );

    const fields = [
      "date", "open", "high",
      "low", "close", "volume"
    ];

    for (const field of fields) {
      if (index[field] === undefined) {
        throw new Error(`필수 데이터 누락: ${field}`);
      }
    }

    const bars = rows
      .map(row => {
        const item = {};
        for (const field of fields) {
          item[field] = row[index[field]];
        }
        return item;
      })
      .filter(row =>
        Number(row.close) > 0 &&
        Number(row.open) > 0
      )
      .sort((a, b) =>
        String(a.date).localeCompare(String(b.date))
      )
      .slice(-350);

    if (bars.length === 0) {
      throw new Error("사용 가능한 주가 데이터가 없습니다.");
    }

    return Response.json(
      {
        code,
        name: stocks[code],
        bars,
        source: "aikstockdata.com",
        updated: bars[bars.length - 1].date
      },
      {
        status: 200,
        headers: {
          ...headers,
          "Cache-Control": "public, max-age=1800"
        }
      }
    );

  } catch (error) {
    console.error("Prices function error:", error);

    return Response.json(
      {
        error: "주가 데이터를 불러오지 못했습니다.",
        detail: error.message
      },
      { status: 502, headers }
    );
  }
}

export const config = {
  path: "/api/prices"
};
