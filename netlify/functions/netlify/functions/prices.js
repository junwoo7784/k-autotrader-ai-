const stocks={"005930":"삼성전자","000660":"SK하이닉스","005380":"현대차","105560":"KB금융","035420":"NAVER","035720":"카카오"};
export default async (request)=>{
 const code=new URL(request.url).searchParams.get('code')||'005930';
 if(!Object.hasOwn(stocks,code))return Response.json({error:'지원하지 않는 종목'},{status:400});
 try{
 const response=await fetch(`https://aikstockdata.com/data/public/s/${code}_history.json`,{headers:{'User-Agent':'KAutoTraderDemo/0.5'},signal:AbortSignal.timeout(12000)});
 if(!response.ok)throw Error(`데이터 제공처 응답 ${response.status}`);
 const j=await response.json(); const columns=j.columns;const rows=j.rows;
 if(!Array.isArray(columns)||!Array.isArray(rows))throw Error('데이터 구조 오류');
 const index=Object.fromEntries(columns.map((x,i)=>[x,i]));
 for(const k of ['date','open','high','low','close','volume'])if(index[k]===undefined)throw Error('누락된 열: '+k);
 const bars=rows.map(r=>{let o={};for(const k of ['date','open','high','low','close','volume'])o[k]=r[index[k]];return o}).filter(r=>Number(r.close)>0&&Number(r.open)>0).sort((a,b)=>String(a.date).localeCompare(String(b.date))).slice(-350);
 return Response.json({code,name:stocks[code],bars,source:'aikstockdata.com',updated:bars.at(-1)?.date||null},{headers:{'Cache-Control':'public,max-age=1800'}});
 }catch(e){return Response.json({error:'시세를 불러오지 못했습니다: '+e.message},{status:502})}
};
