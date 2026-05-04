const fs = require('fs');
const file = 'src/components/analysis/analysis-client.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `          <Card style={{ animation: \`fadeSlideUp 0.65s ease-out both\`, animationDelay: "380ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Error by Wind Regime
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Simulated offshore vs onshore characteristics
            </p>
            <RegimeChartCard data={viewModel.regimeData} isAnimationActive={!printMode} animationBegin={440} />
          </Card>

          <Card style={{ animation: \`fadeSlideUp 0.65s ease-out both\`, animationDelay: "440ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Error Distribution
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Histogram of (Forecast - Actual) errors
            </p>
            <HistogramChartCard data={viewModel.histogramData} isAnimationActive={!printMode} animationBegin={500} />
          </Card>

          <Card style={{ animation: \`fadeSlideUp 0.65s ease-out both\`, animationDelay: "500ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col lg:col-span-2">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Forecast vs Actual Correlation
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Scatter plot of target predictions vs true generation
            </p>
            <ScatterChartCard data={scatterData} isAnimationActive={false} animationBegin={0} />
          </Card>

          <Card style={{ animation: \`fadeSlideUp 0.65s ease-out both\`, animationDelay: "560ms" }} className="reveal-smooth bg-[#14171C]/40 border-white/5 rounded-2xl p-5 shadow-2xl flex flex-col">
            <CardTitle className="text-base text-white tracking-tight mb-1">
              Reliable Wind Capacity
            </CardTitle>
            <p className="text-[10px] font-mono text-slate-500 uppercase mb-4">
              Dependable generation based on Jan 2024 actuals
            </p>
            {viewModel.capacityStats && (
              <div className="flex-1 flex flex-col gap-3">
                  {viewModel.capacityBars.map((item, index) => (
                    <div key={item.label} className="flex flex-col gap-1.5">
                      <div className="flex justify-between text-[11px] font-mono">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="text-white font-bold">
                          {item.value.toFixed(0)} MW{" "}
                          <span className="text-slate-500 font-normal">({item.pct})</span>
                        </span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={\`h-full \${item.color} rounded-full\`}
                          style={{
                            width: \`\${Math.max(item.width, 2)}%\`,
                            transitionProperty: "width",
                            transitionDuration: "1.8s",
                            transitionTimingFunction: "cubic-bezier(0.25, 1, 0.5, 1)",
                            transitionDelay: \`\${620 + index * 140}ms\`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
`;

const regex = /          <Card style=\{\{ animation: `fadeSlideUp 0\.65s ease-out both`, animationDelay: "380ms" \}\} className="reveal-smooth bg-\[#14171C\]\/40 border-white\/5 rounded-2xl p-5 shadow-2xl\">[\s\S]*?(?=                  <div className=\"mt-auto pt-3 border-t border-white\/5\">)/;

if (regex.test(content)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content);
  console.log("Success");
} else {
  console.log("Regex not found");
}
