// js/ui.js
import { createBarChart, createLineChart, createHistogram, createBoxPlot } from './charts.js';
import { formatCurrency, calculateCorrelation } from './utils.js';

// --- Funções de Renderização dos Capítulos ---

export function renderChapterOverview(contentEl, dataToUse, getCachedStats) {
    const totalRecords = dataToUse.length;
    const uniqueStations = _.uniqBy(dataToUse, 'cnpjDaRevenda').length;
    const fuelTypes = _.uniq(dataToUse.map(d => d.produto));
    const regionals = _.uniq(dataToUse.map(d => d.regional)).filter(r => r !== 'Não Identificada');
    
    const stats = getCachedStats('overview', () => ({
        recordsBySemester: _.countBy(dataToUse, 'semestre'),
        recordsByFuel: _.countBy(dataToUse, 'produto'),
        recordsByRegional: _.countBy(dataToUse, 'regional'),
        recordsByBrand: _.countBy(dataToUse, 'bandeira'),
    }));

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
                    ${createMetricCard('Total de Registros', totalRecords.toLocaleString('pt-BR'), 'Número total de observações de preços coletadas.', 'database')}
                    ${createMetricCard('Postos Únicos', uniqueStations.toLocaleString('pt-BR'), 'Quantidade de postos distintos identificados em BH.', 'gas-pump')}
                    
                    ${createMetricCard('Combustível Analisado', 'Gasolina', 'A análise foca apenas em Gasolina Comum.', 'flame')}
                    
                    ${createMetricCard('Regionais Mapeadas', regionals.length, 'Número de regionais de BH com dados.', 'map-pinned')}
                    ${createMetricCard('Período Analisado', '3.5 Anos', 'A análise cobre de Jan/2022 a Jun/2025.', 'calendar-days')}
                    ${createMetricCard('Abrangência', 'Belo Horizonte', 'O escopo geográfico é restrito à capital mineira.', 'map')}
                </div>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    ${createChartCard('dist-semester', 'Registros por Semestre', 'Distribuição das coletas ao longo do tempo.')}
                    
                    ${createChartCard('dist-regional', 'Registros por Regional', 'Cobertura de dados em cada regional.')}
                    ${createChartCard('dist-brand', 'Top 10 Bandeiras', 'As 10 bandeiras com mais registros.')}
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Visão Geral dos Dados',
                    `<h4 class="font-semibold text-gray-700 mb-2">Amostra vs. População</h4>
                     <p class="text-sm text-gray-600 mb-4">Os dados representam uma <strong>amostra</strong> dos postos de BH, um subconjunto representativo, não a <strong>população</strong> completa. A confiabilidade das conclusões depende do tamanho da amostra.</p>
                     <h4 class="font-semibold text-gray-700 mb-2">Tipos de Variáveis</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li><strong>Categóricas:</strong> Classificam dados em grupos (ex: Regional, Bandeira).</li>
                        <li><strong>Numéricas:</strong> Medem uma quantidade (ex: Valor de Venda).</li>
                     </ul></p>`
                )}
            </div>
        </div>`;
    
    const recordsBySemester = stats.recordsBySemester;
    const sortedSemesters = Object.keys(recordsBySemester).sort();
    const sortedSemesterValues = sortedSemesters.map(semester => recordsBySemester[semester]);
    createBarChart('dist-semester', sortedSemesters, sortedSemesterValues, { indexAxis: 'y' });

    const recordsByRegional = stats.recordsByRegional;
    const regionalKeys = Object.keys(recordsByRegional);
    const regionalValues = regionalKeys.map(k => recordsByRegional[k]);
    createBarChart('dist-regional', regionalKeys, regionalValues);
    
    const top10Brands = _.chain(stats.recordsByBrand).toPairs().sortBy(1).reverse().take(10).fromPairs().value();
    createBarChart('dist-brand', Object.keys(top10Brands), Object.values(top10Brands), { indexAxis: 'y' });
}

export function renderChapterDistribution(contentEl, filteredData, getCachedStats, detectOutliers) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    const prices = filteredData.map(d => d.valorDeVenda);
    const stats = getCachedStats('distribution', () => {
        
        if (prices.length === 0) {
            return { mean: 0, median: 0, mode: 'N/A', std: 0, min: 0, max: 0, q1: 0, q3: 0, iqr: 0, outliers: [] };
        }

        const sortedPrices = [...prices].sort((a, b) => a - b);
        return {
            mean: math.mean(prices), median: math.median(sortedPrices), mode: math.mode(prices)[0] || 'N/A',
            std: math.std(prices, 'unbiased'), min: sortedPrices[0], max: sortedPrices[sortedPrices.length - 1],
            q1: math.quantileSeq(sortedPrices, 0.25, false), q3: math.quantileSeq(sortedPrices, 0.75, false),
        };
    });
    
    stats.cv = stats.mean ? (stats.std / stats.mean) * 100 : 0;
    stats.iqr = (typeof stats.q3 === 'number' && typeof stats.q1 === 'number') ? stats.q3 - stats.q1 : 0;
    stats.outliers = stats.iqr > 0 ? detectOutliers(prices, stats.q1, stats.q3, stats.iqr) : [];


    contentEl.innerHTML = `
         <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-xl font-semibold mb-4">Estatísticas Descritivas do Preço (R$)</h3>
                    <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
                        ${createMetricCard('Média', formatCurrency(stats.mean), 'O valor médio dos preços. Sensível a valores extremos.', 'baseline')}
                        ${createMetricCard('Mediana', formatCurrency(stats.median), 'O valor central que divide os dados. Mais robusto a extremos.', 'git-commit-vertical')}
                        ${createMetricCard('Moda', formatCurrency(stats.mode), 'O preço que aparece com mais frequência.', 'trending-up')}
                        ${createMetricCard('Desvio Padrão', formatCurrency(stats.std), 'Mede o grau de dispersão dos preços em torno da média.', 'move-horizontal')}
                        ${createMetricCard('Coef. Variação', `${stats.cv.toFixed(1)}%`, 'Dispersão relativa à média. Útil para comparações.', 'percent')}
                        ${createMetricCard('Mínimo', formatCurrency(stats.min), 'O menor preço observado na amostra.', 'arrow-down-circle')}
                        ${createMetricCard('Máximo', formatCurrency(stats.max), 'O maior preço observado na amostra.', 'arrow-up-circle')}
                        ${createMetricCard('Outliers', `${stats.outliers.length} (${(prices.length > 0 ? stats.outliers.length / prices.length * 100 : 0).toFixed(1)}%)`, 'Valores atípicos, muito distantes da maioria.', 'alert-triangle')}
                    </div>
                </div>
                <div class="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    ${createChartCard('histogram', 'Histograma de Preços', 'Mostra a frequência de preços em diferentes faixas.')}
                    ${createChartCard('boxplot', 'Box Plot de Preços', 'Visualiza a distribuição, quartis e outliers de forma concisa.')}
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Entendendo as Distribuições',
                    `<h4 class="font-semibold text-gray-700 mb-2">Média vs. Mediana</h4>
                     <p class="text-sm text-gray-600 mb-4">Se a <strong>média</strong> é muito diferente da <strong>mediana</strong>, a distribuição é assimétrica, puxada por valores extremos. A mediana se torna uma medida mais confiável do centro.</p>
                     <h4 class="font-semibold text-gray-700 mb-2">Interpretando o Box Plot</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li>A <strong>linha central</strong> é a mediana.</li>
                        <li>A <strong>caixa</strong> contém os 50% centrais dos dados (de Q1 a Q3).</li>
                        <li>As <strong>"hastes"</strong> mostram a maior parte dos dados.</li>
                        <li>Os <strong>pontos fora</strong> são os outliers.</li>
                     </ul></p>`
                )}
            </div>
         </div>`;

    createHistogram('histogram', prices, stats.mean, stats.median);
    createBoxPlot('boxplot', prices, 'Preços (R$)');
}

export function renderChapterTemporal(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }
    const stats = getCachedStats('temporal', () => {
        const groupedBySemester = _.groupBy(filteredData, 'semestre');
        const semesters = Object.keys(groupedBySemester).sort();
        
        const pricesByFuelOverTime = _.chain(filteredData).groupBy('produto').mapValues(fuelData => {
            const pricesBySemester = _.groupBy(fuelData, 'semestre');
            return semesters.map(sem => {
                const semesterPrices = pricesBySemester[sem];
                return semesterPrices ? math.mean(semesterPrices.map(p => p.valorDeVenda)) : null;
            });
        }).value();

        const firstSemAvgs = [];
        const secondSemAvgs = [];
        semesters.forEach(sem => {
            const semData = groupedBySemester[sem];
            if (semData && semData.length > 0) {
                const avg = math.mean(semData.map(d => d.valorDeVenda));
                if (sem.includes('S1')) {
                    firstSemAvgs.push(avg);
                } else {
                    secondSemAvgs.push(avg);
                }
            }
        });

        const seasonality = {
            firstSemAvg: firstSemAvgs.length > 0 ? math.mean(firstSemAvgs) : 0,
            secondSemAvg: secondSemAvgs.length > 0 ? math.mean(secondSemAvgs) : 0,
            hasSeason: false
        };

        if (firstSemAvgs.length > 0 && secondSemAvgs.length > 0) {
            const diff = Math.abs(seasonality.secondSemAvg - seasonality.firstSemAvg);
            const avgPrice = (seasonality.firstSemAvg + seasonality.secondSemAvg) / 2;
            seasonality.hasSeason = (diff / avgPrice) > 0.03;
        }

        const allPrices = semesters.map(sem => {
            const semData = groupedBySemester[sem];
            return (semData && semData.length > 0) ? math.mean(semData.map(d => d.valorDeVenda)) : 0;
        }).filter(p => p > 0); // Filtra semestres sem dados

        if (allPrices.length < 2) { // Não pode calcular tendência com menos de 2 pontos
             return {
                semesters, pricesByFuelOverTime, seasonality,
                trend: { slope: 0, intercept: 0, totalVariation: 0, firstPrice: 0, lastPrice: 0 },
                projections: [], variations: [], avgVariation: 0
            };
        }

        const n = allPrices.length;
        const xValues = Array.from({ length: n }, (_, i) => i);
        const sumX = _.sum(xValues);
        const sumY = _.sum(allPrices);
        const sumXY = _.sum(xValues.map((x, i) => x * allPrices[i]));
        const sumXX = _.sum(xValues.map(x => x * x));

        const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;

        const projections = [];
        for (let i = 0; i < 3; i++) {
            projections.push(slope * (n + i) + intercept);
        }

        const firstPrice = allPrices[0];
        const lastPrice = allPrices[n - 1];
        const totalVariation = ((lastPrice - firstPrice) / firstPrice) * 100;

        const variations = [];
        for (let i = 1; i < allPrices.length; i++) {
            const variation = ((allPrices[i] - allPrices[i - 1]) / allPrices[i - 1]) * 100;
            variations.push(variation);
        }

        return {
            semesters,
            pricesByFuelOverTime,
            seasonality,
            trend: {
                slope,
                intercept,
                totalVariation,
                firstPrice,
                lastPrice
            },
            projections,
            variations,
            avgVariation: variations.length > 0 ? math.mean(variations.map(Math.abs)) : 0
        };
    });

    const trendInterpretation = stats.trend.totalVariation > 5
        ? `<span class="text-red-600">crescente</span> com aumento de <strong>${stats.trend.totalVariation.toFixed(1)}%</strong>`
        : stats.trend.totalVariation < -5
            ? `<span class="text-green-600">decrescente</span> com queda de <strong>${Math.abs(stats.trend.totalVariation).toFixed(1)}%</strong>`
            : `<span class="text-gray-600">estável</span> com variação de apenas <strong>${stats.trend.totalVariation.toFixed(1)}%</strong>`;

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                ${createChartCard('temporal-evolution', 'Evolução do Preço Médio por Semestre', 'Acompanhe a variação dos preços dos combustíveis ao longo do tempo.')}

                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    ${createMetricCard('Primeiro Semestre', formatCurrency(stats.trend.firstPrice), 'Preço médio no início do período analisado.', 'calendar-days')}
                    ${createMetricCard('Último Semestre', formatCurrency(stats.trend.lastPrice), 'Preço médio no período mais recente.', 'calendar-check')}
                    ${createMetricCard('Variação Total', `${stats.trend.totalVariation.toFixed(1)}%`, 'Mudança percentual entre primeiro e último semestre.', 'trending-up')}
                </div>

                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Análise de Tendência</h3>
                    <p class="text-sm text-gray-700 mb-4">
                        Os dados mostram tendência ${trendInterpretation} ao longo dos ${stats.semesters.length} semestres analisados.
                        A variação média entre semestres consecutivos foi de <strong>${stats.avgVariation.toFixed(1)}%</strong>.
                    </p>
                    ${stats.projections.length > 0 ? `
                        <div class="mt-4 p-4 bg-blue-50 rounded border border-blue-200">
                            <h4 class="font-semibold text-blue-900 mb-2 flex items-center space-x-2">
                                <i data-lucide="crystal-ball" class="h-5 w-5"></i>
                                <span>Projeções para Próximos Semestres</span>
                            </h4>
                            <div class="grid grid-cols-3 gap-3 text-sm">
                                <div class="bg-white p-3 rounded">
                                    <p class="text-gray-600">+1 Semestre</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.projections[0])}</p>
                                </div>
                                <div class="bg-white p-3 rounded">
                                    <p class="text-gray-600">+2 Semestres</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.projections[1])}</p>
                                </div>
                                <div class="bg-white p-3 rounded">
                                    <p class="text-gray-600">+3 Semestres</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.projections[2])}</p>
                                </div>
                            </div>
                            <p class="text-xs text-blue-700 mt-3">
                                <i data-lucide="alert-triangle" class="h-3 w-3 inline"></i>
                                Projeções baseadas em tendência linear. Eventos imprevistos podem alterar significativamente os valores reais.
                            </p>
                        </div>
                    ` : ''}
                </div>

                ${stats.seasonality.hasSeason ? `
                    <div class="bg-white p-6 rounded-lg shadow">
                        <h3 class="text-lg font-semibold mb-3">Análise de Sazonalidade</h3>
                        <p class="text-sm text-gray-700 mb-4">
                            Foi detectado padrão sazonal nos dados. Primeiros semestres (S1) tendem a ter preços diferentes dos segundos semestres (S2).
                        </p>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="bg-blue-50 p-4 rounded">
                                <p class="text-sm text-gray-600">Média S1 (Jan-Jun)</p>
                                <p class="text-2xl font-bold text-gray-800">${formatCurrency(stats.seasonality.firstSemAvg)}</p>
                            </div>
                            <div class="bg-orange-50 p-4 rounded">
                                <p class="text-sm text-gray-600">Média S2 (Jul-Dez)</p>
                                <p class="text-2xl font-bold text-gray-800">${formatCurrency(stats.seasonality.secondSemAvg)}</p>
                            </div>
                        </div>
                        <p class="text-sm text-gray-600 mt-3">
                            Diferença: <strong>${formatCurrency(Math.abs(stats.seasonality.secondSemAvg - stats.seasonality.firstSemAvg))}</strong>
                            
                            (${((Math.abs(stats.seasonality.secondSemAvg - stats.seasonality.firstSemAvg) / stats.seasonality.firstSemAvg) * 100).toFixed(1)}%)
                        
                        </p>
                    </div>
                ` : ''}

                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-lg font-semibold mb-3">Comparação Primeiro vs. Último Semestre</h3>
                    <div class="space-y-3 text-sm">
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span class="text-gray-700">Período Inicial (${stats.semesters[0]})</span>
                            <span class="font-bold text-gray-800">${formatCurrency(stats.trend.firstPrice)}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
                            <span class="text-gray-700">Período Final (${stats.semesters[stats.semesters.length - 1]})</span>
                            <span class="font-bold text-gray-800">${formatCurrency(stats.trend.lastPrice)}</span>
                        </div>
                        <div class="flex justify-between items-center p-3 ${stats.trend.totalVariation > 0 ? 'bg-red-50' : 'bg-green-50'} rounded border ${stats.trend.totalVariation > 0 ? 'border-red-200' : 'border-green-200'}">
                            <span class="font-semibold ${stats.trend.totalVariation > 0 ? 'text-red-700' : 'text-green-700'}">
                                Variação Total
                            </span>
                            <span class="font-bold ${stats.trend.totalVariation > 0 ? 'text-red-800' : 'text-green-800'}">
                                ${stats.trend.totalVariation > 0 ? '+' : ''}${stats.trend.totalVariation.toFixed(1)}%
                            </span>
                        </div>
                    </div>
                    <div class="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
                        <p class="text-sm text-blue-900">
                            <strong>Impacto para o Consumidor:</strong> Um motorista que abastece 40 litros semanalmente
                            gasta aproximadamente <strong>R$ ${((stats.trend.lastPrice - stats.trend.firstPrice) * 40 * 4).toFixed(2)}</strong>
                            a mais por mês comparado ao início do período.
                        </p>
                    </div>
                </div>
            </div>

            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Análise de Séries Temporais',
                    `<h4 class="font-semibold text-gray-700 mb-2">Componentes da Série</h4>
                     <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li><strong>Tendência:</strong> Movimento de longo prazo (aumento/queda).</li>
                        <li><strong>Sazonalidade:</strong> Padrões que se repetem regularmente.</li>
                        <li><strong>Ruído:</strong> Variações aleatórias.</li>
                     </ul>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Limitações</h4>
                     <p class="text-sm text-gray-600">Projeções são baseadas no passado e não preveem eventos inesperados (crises, mudanças de impostos, pandemia).</p>`
                )}
            </div>
        </div>`;
    createLineChart('temporal-evolution', stats.semesters, stats.pricesByFuelOverTime);
}

export function renderChapterRegional(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }
    const stats = getCachedStats('regional', () => {
        const regionalStats = _.mapValues(_.groupBy(filteredData, 'regional'), (data, regional) => {
            if (regional === 'Não Identificada' || data.length < 2) return null;
            const prices = data.map(d => d.valorDeVenda);
            return {
                count: data.length, mean: math.mean(prices), median: math.median(prices),
                std: math.std(prices), min: math.min(prices), max: math.max(prices), prices
            };
        });
        return _.omitBy(regionalStats, _.isNull);
    });
    const sortedRegionals = _.orderBy(Object.entries(stats), ([, s]) => s.mean, 'asc');
    const meanPricesByRegional = _.mapValues(stats, 'mean');
    contentEl.innerHTML = `
         <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                ${createChartCard('regional-boxplot', 'Distribuição de Preços por Regional', 'Compare a variação de preços entre as diferentes regionais de BH.')}
                <div class="bg-white p-6 rounded-lg shadow overflow-x-auto">
                    <h3 class="text-lg font-semibold mb-4">Estatísticas por Regional</h3>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2">Regional</th>
                                <th class="p-2 text-right">Média (R$)</th>
                                <th class="p-2 text-right">Mediana (R$)</th>
                                <th class="p-2 text-right">Desvio Padrão</th>
                                <th class="p-2 text-right">Registros</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${sortedRegionals.map(([regional, s]) => `
                                <tr class="border-b">
                                    <td class="p-2 font-medium">${regional}</td>
                                    <td class="p-2 text-right">${formatCurrency(s.mean)}</td>
                                    <td class="p-2 text-right">${formatCurrency(s.median)}</td>
                                    <td class="p-2 text-right">${formatCurrency(s.std)}</td>
                                    <td class="p-2 text-right">${s.count.toLocaleString('pt-BR')}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                 ${createSidebar(
                    'Análise Regional',
                    `<h4 class="font-semibold text-gray-700 mb-2">Variância</h4>
                     <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li><strong>ENTRE grupos:</strong> Diferenças nas médias entre as regionais.</li>
                        <li><strong>DENTRO de grupos:</strong> Variação de preços na mesma regional.</li>
                     </ul></p>
                     <p class="text-sm text-gray-600 mt-2">Se a variância ENTRE for alta, a localização é um fator importante para o preço.</p>
                     <h4 class="font-semibold text-gray-700 mt-4 mb-2">Fatores de Variação</h4>
                     <p class="text-sm text-gray-600">Perfil socioeconômico, concorrência, logística e acesso a grandes avenidas podem influenciar os preços.</p>`
                )}
            </div>
         </div>`;
    createBoxPlot('regional-boxplot', stats, 'regional');
}


// --- INÍCIO DA SEÇÃO 'BANDEIRAS' ---


export function renderChapterBandeiras(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    // Cálculos
    const { brandStats, averageOfAverages } = getCachedStats('bandeiras', () => {
        const MIN_RECORDS_FOR_BRAND = 10; 
        
        const stats = _.chain(filteredData)
            .groupBy('bandeira')
            .map((data, nomeBandeira) => {
                if (nomeBandeira === 'Não Identificada' || data.length < MIN_RECORDS_FOR_BRAND) {
                    return null;
                }
                const prices = data.map(d => d.valorDeVenda);
                return {
                    bandeira: nomeBandeira,
                    count: data.length,
                    mean: math.mean(prices),
                    min: math.min(prices),
                    median: math.median(prices)
                };
            })
            .compact() 
            .orderBy(['mean'], ['asc']) // Ordena do mais barato ao mais caro
            .value();
        
        const allAverages = stats.map(s => s.mean);
        const avgOfAvgs = allAverages.length > 0 ? math.mean(allAverages) : 0;
        
        return { brandStats: stats, averageOfAverages: avgOfAvgs };
    });

    // Separando os dados
    const podium = brandStats.slice(0, 3);
    const top15Cheapest = brandStats.slice(0, 15);
    const cheapestBrand = brandStats.length > 0 ? brandStats[0] : null; // <--- DADO PARA O NOVO CARD

    // HTML do Pódio
    const podiumHtml = `
        <div class="bg-white p-6 rounded-lg shadow">
            <h3 class="text-xl font-semibold mb-6 text-center text-gray-800 flex items-center justify-center space-x-2">
                <i data-lucide="trophy" class="h-6 w-6 text-yellow-500"></i>
                <span>Pódio: Melhores Médias de Preço</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                ${podium[1] ? `
                <div class="bg-gray-100 p-4 rounded-lg border border-gray-300 transform scale-95 opacity-80">
                    <i data-lucide="medal" class="h-10 w-10 text-gray-500 mx-auto mb-2"></i>
                    <p class="text-sm font-semibold text-gray-600">2º Lugar</p>
                    <p class="text-lg font-bold text-gray-800 truncate">${podium[1].bandeira}</p>
                    <p class="text-xl font-bold text-gray-900">${formatCurrency(podium[1].mean)}</p>
                </div>
                ` : '<div class="hidden md:block"></div>'}

                ${podium[0] ? `
                <div class="bg-yellow-50 p-6 rounded-lg border-2 border-yellow-400 shadow-lg transform scale-105 z-10">
                    <i data-lucide="award" class="h-12 w-12 text-yellow-600 mx-auto mb-2"></i>
                    <p class="text-md font-semibold text-yellow-700">1º Lugar</p>
                    <p class="text-xl font-bold text-yellow-900 truncate">${podium[0].bandeira}</p>
                    <p class="text-2xl font-extrabold text-yellow-900">${formatCurrency(podium[0].mean)}</p>
                </div>
                ` : '<div class="hidden md:block"></div>'}
                
                ${podium[2] ? `
                <div class="bg-orange-50 p-4 rounded-lg border border-orange-300 transform scale-95 opacity-80">
                    <i data-lucide="medal" class="h-10 w-10 text-orange-600 mx-auto mb-2"></i>
                    <p class="text-sm font-semibold text-orange-700">3º Lugar</p>
                    <p class="text-lg font-bold text-orange-900 truncate">${podium[2].bandeira}</p>
                    <p class="text-xl font-bold text-orange-900">${formatCurrency(podium[2].mean)}</p>
                </div>
                ` : '<div class="hidden md:block"></div>'}
            </div>
            ${podium.length < 3 ? '<p class="text-center text-sm text-gray-500 mt-4">Dados insuficientes para completar o pódio (mín. 10 registros por bandeira).</p>' : ''}
        </div>
    `;

    // Card para a Bandeira Mais Barata
    let cheapestBrandCardHtml = '';
    if (cheapestBrand) {
        cheapestBrandCardHtml = `
            <div class="bg-white p-4 rounded-lg shadow has-tooltip relative metric-card mt-6">
                <div class="flex items-start justify-between">
                    <div>
                        <p class="text-sm text-gray-500">Bandeira Mais Barata (Média)</p>
                        <p class="text-lg font-bold text-gray-800 truncate" title="${cheapestBrand.bandeira}">${cheapestBrand.bandeira}</p>
                        <p class="text-2xl font-bold text-green-600">${formatCurrency(cheapestBrand.mean)}</p>
                    </div>
                    <div class="bg-green-100 p-2 rounded-full">
                        <i data-lucide="award" class="h-6 w-6 text-green-600"></i>
                    </div>
                </div>
                <div class="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded py-2 px-3 z-50">
                    Esta é a bandeira com o menor preço médio, considerando apenas bandeiras com 10 ou mais registros.
                </div>
            </div>
        `;
    }

    // Card para a Média das Médias
    const avgOfAvgsCard = `
        <div class="bg-white p-4 rounded-lg shadow has-tooltip relative metric-card mt-6">
            <div class="flex items-start justify-between">
                <div>
                    <p class="text-sm text-gray-500">Média das Médias</p>
                    <p class="text-2xl font-bold text-gray-800">${formatCurrency(averageOfAverages)}</p>
                </div>
                <div class="bg-blue-100 p-2 rounded-full">
                    <i data-lucide="calculator" class="h-6 w-6 text-blue-600"></i>
                </div>
            </div>
            <div class="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded py-2 px-3 z-50">
                Este valor é a média aritmética dos preços médios de todas as bandeiras qualificadas (com 10+ registros).
            </div>
        </div>
    `;

    // Renderização do HTML principal
    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                
                ${podiumHtml}

                ${createChartCard('bandeiras-avg-price', 'Preço Médio por Bandeira (Top 15 mais baratas)', 'Comparação do preço médio de gasolina entre as bandeiras com mais de 10 registros.')}
                
                <div class="bg-white p-6 rounded-lg shadow overflow-x-auto">
                    <h3 class="text-lg font-semibold mb-4">Estatísticas Detalhadas por Bandeira</h3>
                    <p class="text-sm text-gray-600 mb-4">Exibindo bandeiras com 10 ou mais registros, ordenadas por preço médio.</p>
                    <table class="w-full text-sm text-left">
                        <thead class="bg-gray-100">
                            <tr>
                                <th class="p-2">Bandeira</th>
                                <th class="p-2 text-right">Média (R$)</th>
                                <th class="p-2 text-right">Mediana (R$)</th>
                                <th class="p-2 text-right">Mínimo (R$)</th>
                                <th class="p-2 text-right">Registros</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${brandStats.map(b => `
                                <tr class="border-b">
                                    <td class="p-2 font-medium">${b.bandeira}</td>
                                    <td class="p-2 text-right font-bold">${formatCurrency(b.mean)}</td>
                                    <td class="p-2 text-right">${formatCurrency(b.median)}</td>
                                    <td class="p-2 text-right text-green-600">${formatCurrency(b.min)}</td>
                                    <td class="p-2 text-right">${b.count.toLocaleString('pt-BR')}</td>
                                </tr>`).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Análise por Bandeira',
                    `<h4 class="font-semibold text-gray-700 mb-2">Bandeira Branca vs. Marcas Estabelecidas</h4>
                    <p class="text-sm text-gray-600 mb-4">Postos "bandeira branca" (sem vínculo com grandes distribuidoras) frequentemente oferecem preços mais competitivos, pois têm maior liberdade na compra do combustível.</p>
                    <p class="text-sm text-gray-600 mb-4">Grandes marcas (como Shell, Ipiranga, Petrobras) podem ter preços mais altos, muitas vezes associados a programas de fidelidade, lojas de conveniência e percepção de qualidade/confiabilidade no combustível.</p>
                    <h4 class="font-semibold text-gray-700 mt-4 mb-2">O que observar?</h4>
                    <p class="text-sm text-gray-600"><ul class="list-disc list-inside mt-2 text-sm space-y-1">
                        <li><strong>Preço Mínimo:</strong> O "melhor preço" encontrado para cada bandeira.</li>
                        <li><strong>Média vs. Mediana:</strong> Se a média for muito maior que a mediana, significa que alguns postos dessa bandeira cobram valores muito altos, puxando a média para cima.</li>
                    </ul></p>`
                )}

                ${cheapestBrandCardHtml}

                ${avgOfAvgsCard}
            </div>
        </div>`;

    // Criar o gráfico
    if (top15Cheapest.length > 0) {
        createBarChart(
            'bandeiras-avg-price', 
            top15Cheapest.map(b => b.bandeira), 
            top15Cheapest.map(b => b.mean), 
            { 
                label: 'Preço Médio',
                indexAxis: 'y', 
                plugins: {
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return ` Média: ${formatCurrency(context.parsed.x)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        title: { display: true, text: 'Preço Médio (R$)' },
                        ticks: {
                            callback: function(value) {
                                return formatCurrency(value);
                            }
                        }
                    }
                }
            }
        );
    }
}


// --- FIM DA SEÇÃO 'BANDEIRAS' ---



export function renderChapterCorrelation(contentEl, filteredData, getCachedStats) {
    if (filteredData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    const stats = getCachedStats('correlation', () => {
        const prices = filteredData.map(d => d.valorDeVenda);
        const dates = filteredData.map(d => d.dataDaColeta ? d.dataDaColeta.getTime() / (1000 * 60 * 60 * 24 * 30) : 0);

        const priceTimeCor = (prices.length > 1 && dates.length > 1) ? calculateCorrelation(prices, dates) : 0;

        const fuelPrices = _.groupBy(filteredData, 'produto');
        const gasolinaComum = fuelPrices['GASOLINA'] || [];
        const etanol = fuelPrices['ETANOL'] || []; 

        let etanolGasolinaParity = null;
        if (gasolinaComum.length > 0 && etanol.length > 0) { 
            const avgGasolina = math.mean(gasolinaComum.map(d => d.valorDeVenda));
            const avgEtanol = math.mean(etanol.map(d => d.valorDeVenda));
            etanolGasolinaParity = (avgEtanol / avgGasolina) * 100;
        }

        return {
            priceTimeCor,
            etanolGasolinaParity, 
            gasolinaAvg: gasolinaComum.length > 0 ? math.mean(gasolinaComum.map(d => d.valorDeVenda)) : null,
            etanolAvg: etanol.length > 0 ? math.mean(etanol.map(d => d.valorDeVenda)) : null
        };
    });

    const interpretCorrelation = (cor) => {
        const abs = Math.abs(cor);
        if (abs >= 0.8) return 'muito forte';
        if (abs >= 0.6) return 'forte';
        if (abs >= 0.4) return 'moderada';
        if (abs >= 0.2) return 'fraca';
        return 'muito fraca ou inexistente';
    };

    const parityInterpretation = stats.etanolGasolinaParity
        ? stats.etanolGasolinaParity <= 70
            ? 'O etanol está <strong>vantajoso</strong> economicamente. Motoristas com carros flex devem optar pelo etanol.'
            : 'A gasolina está <strong>mais vantajosa</strong> economicamente neste momento.'
        : 'Dados insuficientes para calcular paridade.';

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-xl font-semibold mb-4">Principais Correlações Identificadas</h3>
                    <div class="space-y-4">
                        <div class="border-l-4 border-blue-500 pl-4">
                            <h4 class="font-semibold text-gray-800">Preço vs. Tempo</h4>
                            <p class="text-sm text-gray-600 mt-1">
                                Coeficiente de correlação: <strong>${stats.priceTimeCor.toFixed(3)}</strong>
                                <span class="ml-2 text-gray-500">(Correlação ${interpretCorrelation(stats.priceTimeCor)})</span>
                            </p>
                            <p class="text-sm text-gray-700 mt-2">
                                ${stats.priceTimeCor > 0.3
                                    ? 'Há uma <strong>tendência de aumento</strong> nos preços ao longo do tempo em Belo Horizonte. Cada semestre que passa está associado a preços médios mais elevados.'
                                    : stats.priceTimeCor < -0.3
                                        ? 'Os preços apresentam <strong>tendência de queda</strong> ao longo do tempo.'
                                        : 'Não há tendência temporal clara nos preços. Os valores flutuam sem padrão consistente de alta ou baixa.'}
                            </p>
                        </div>

                        ${stats.etanolGasolinaParity ? `
                        <div class="border-l-4 border-green-500 pl-4">
                            <h4 class="font-semibold text-gray-800">Paridade Etanol-Gasolina</h4>
                            <p class="text-sm text-gray-600 mt-1">
                                Relação atual: <strong>${stats.etanolGasolinaParity.toFixed(1)}%</strong>
                                <span class="ml-2 px-2 py-1 rounded text-xs font-medium ${stats.etanolGasolinaParity <= 70 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}">
                                    ${stats.etanolGasolinaParity <= 70 ? 'Etanol Vantajoso' : 'Gasolina Vantajosa'}
                                </span>
                            </p>
                            <p class="text-sm text-gray-700 mt-2">
                                ${parityInterpretation}
                            </p>
                            <div class="mt-3 grid grid-cols-2 gap-4 text-sm">
                                <div class="bg-gray-50 p-3 rounded">
                                    <p class="text-gray-600">Gasolina Comum</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.gasolinaAvg)}</p>
                                </div>
                                <div class="bg-gray-50 p-3 rounded">
                                    <p class="text-gray-600">Etanol</p>
                                    <p class="text-lg font-bold text-gray-800">${formatCurrency(stats.etanolAvg)}</p>
                                </div>
                            </div>
                        </div>` : ''}
                    </div>
                </div>

                <div class="bg-blue-50 border border-blue-200 p-6 rounded-lg">
                    <div class="flex items-start space-x-3">
                        <i data-lucide="info" class="h-5 w-5 text-blue-600 mt-0.5"></i>
                        <div>
                            <h4 class="font-semibold text-blue-900">Importante: Correlação ≠ Causalidade</h4>
                            <p class="text-sm text-blue-800 mt-2">
                                Correlação mede apenas se duas variáveis se movem juntas. <strong>Não prova</strong> que uma causa a outra.
                                Fatores externos podem influenciar ambas as variáveis simultaneamente.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'Entendendo Correlações',
                    `<h4 class="font-semibold text-gray-700 mb-2">O que é Correlação?</h4>
                     <p class="text-sm text-gray-600 mb-4">A correlação de Pearson mede a <strong>força e direção</strong> da relação linear entre duas variáveis. Varia de -1 a +1:</p>
                     <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
                        <li><strong>+1:</strong> Correlação positiva perfeita</li>
                        <li><strong>0:</strong> Sem correlação linear</li>
                        <li><strong>-1:</strong> Correlação negativa perfeita</li>
                     </ul>
                     `
                )}
            </div>
        </div>`;
}

export function renderChapterInsights(contentEl, allData, filteredData, getCachedStats, detectOutliers) {
    if (allData.length === 0) {
        contentEl.innerHTML = createEmptyState();
        return;
    }

    const { insights, summary } = getCachedStats('insights', () => generateInsights(allData, filteredData, detectOutliers));

    contentEl.innerHTML = `
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div class="lg:col-span-2 space-y-8">
                <div class="bg-gradient-to-r from-blue-50 to-blue-100 p-8 rounded-lg shadow-lg">
                    <div class="flex items-center space-x-3 mb-4">
                        <i data-lucide="lightbulb" class="h-8 w-8 text-blue-600"></i>
                        <h2 class="text-2xl font-bold text-gray-800">Principais Descobertas</h2>
                    </div>
                    <p class="text-gray-700">
                        Esta seção sintetiza os insights mais importantes da análise completa dos dados
                        de gasolina em Belo Horizonte entre 2023 e 2025.
                    </p>
                </div>

                <div class="space-y-6">
                    ${insights.map((insight, index) => `
                        <div class="bg-white p-6 rounded-lg shadow-md border-l-4 ${getBorderColor(insight.type)}">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <div class="flex items-center space-x-2 mb-2">
                                        <span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-600 text-sm font-bold">
                                            ${index + 1}
                                        </span>
                                        <h3 class="text-lg font-semibold text-gray-800">${insight.title}</h3>
                                    </div>
                                    <p class="text-sm text-gray-600 mb-3 font-medium">${insight.summary}</p>
                                    <div class="text-sm text-gray-700 space-y-2">
                                        ${insight.details}
                                    </div>
                                    ${insight.impact ? `
                                        <div class="mt-4 p-3 bg-gray-50 rounded">
                                            <p class="text-xs font-semibold text-gray-600 mb-1">IMPACTO ESTIMADO:</p>
                                            <p class="text-sm text-gray-700">${insight.impact}</p>
                                        </div>
                                    ` : ''}
                                </div>
                                <i data-lucide="${getInsightIcon(insight.type)}" class="h-6 w-6 text-gray-400 ml-4"></i>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div class="bg-white p-6 rounded-lg shadow">
                    <h3 class="text-xl font-semibold mb-4">Resumo Estatístico Consolidado</h3>
                    <div class="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                        ${createSummaryCard('Total de Registros', summary.totalRecords.toLocaleString('pt-BR'))}
                        ${createSummaryCard('Período', summary.period)}
                        ${createSummaryCard('Preço Médio Geral', formatCurrency(summary.avgPrice))}
                        ${createSummaryCard('Variação Total', `${summary.totalVariation.toFixed(1)}%`)}
                        ${createSummaryCard('Regionais Analisadas', summary.regionalsCount)}
                        ${createSummaryCard('Combustível', 'Gasolina')}
                    </div>
                </div>

                <div class="bg-yellow-50 border border-yellow-200 p-6 rounded-lg">
                    <h4 class="font-semibold text-yellow-900 mb-3 flex items-center space-x-2">
                        <i data-lucide="alert-circle" class="h-5 w-5"></i>
                        <span>Limitações e Considerações</span>
                    </h4>
                    <ul class="text-sm text-yellow-800 space-y-2 list-disc list-inside">
                        <li>Os dados representam uma <strong>amostra</strong>, não a população completa de postos de BH.</li>
                        <li>Análises são <strong>descritivas e correlacionais</strong>, não estabelecem causalidade definitiva.</li>
                        <li>Projeções futuras assumem continuidade de padrões históricos.</li>
                        <li>Variáveis importantes como qualidade ou serviços adicionais não estão disponíveis.</li>
                    </ul>
                </div>
            </div>

            <div class="sidebar p-6 rounded-lg shadow-sm">
                ${createSidebar(
                    'De Dados a Decisões',
                    `<h4 class="font-semibold text-gray-700 mb-2">Para Consumidores</h4>
                     <p class="text-sm text-gray-600 mb-4">Use os insights para escolher <strong>onde e quando abastecer</strong>, considerando regionais com preços mais baixos.</p>

                     <h4 class="font-semibold text-gray-700 mb-2">Para Gestores Públicos</h4>
                     <p class="text-sm text-gray-600 mb-4">Identifique <strong>disparidades regionais</strong> que merecem atenção e monitore tendências para planejamento.</p>
                }
            </div>
        </div>`;
}

function generateInsights(allData, filteredData, detectOutliers) {
    const insights = [];
    const prices = allData.map(d => d.valorDeVenda);
    if (prices.length === 0) return { insights: [], summary: {} };

    const semesters = _.uniq(allData.map(d => d.semestre)).sort();
    if (semesters.length === 0) return { insights: [], summary: {} };

    const firstSemester = semesters[0];
    const lastSemester = semesters[semesters.length - 1];

    const firstSemesterData = allData.filter(d => d.semestre === firstSemester);
    const lastSemesterData = allData.filter(d => d.semestre === lastSemester);

    const firstAvg = firstSemesterData.length > 0 ? math.mean(firstSemesterData.map(d => d.valorDeVenda)) : 0;
    const lastAvg = lastSemesterData.length > 0 ? math.mean(lastSemesterData.map(d => d.valorDeVenda)) : 0;
    const totalVariation = (firstAvg > 0) ? ((lastAvg - firstAvg) / firstAvg) * 100 : 0;

    if (firstAvg > 0 && lastAvg > 0) {
        insights.push({
            type: 'trend',
            title: 'Evolução Temporal dos Preços',
            summary: `Os preços ${totalVariation > 0 ? 'aumentaram' : 'diminuiram'} ${Math.abs(totalVariation).toFixed(1)}% entre ${firstSemester} e ${lastSemester}.`,
            details: `<p>No primeiro semestre analisado (${firstSemester}), o preço médio era de <strong>${formatCurrency(firstAvg)}</strong>.
                      Já no último período (${lastSemester}), o preço médio alcançou <strong>${formatCurrency(lastAvg)}</strong>.</p>`,
            impact: `Um motorista que abastece 40 litros por semana gasta aproximadamente R$ ${((lastAvg - firstAvg) * 40 * 4).toFixed(2)} a mais (ou a menos) por mês comparado ao início do período.`
        });
    }

    const regionalStats = _.mapValues(_.groupBy(allData.filter(d => d.regional !== 'Não Identificada'), 'regional'), data => {
        if (data.length === 0) return null;
        const regionalPrices = data.map(d => d.valorDeVenda);
        return { mean: math.mean(regionalPrices), count: data.length };
    });

    const sortedRegionals = _.orderBy(Object.entries(_.omitBy(regionalStats, _.isNull)), ([,s]) => s.mean, 'asc');
    
    if (sortedRegionals.length >= 2) {
        const cheapest = sortedRegionals[0];
        const expensive = sortedRegionals[sortedRegionals.length - 1];
        const spread = ((expensive[1].mean - cheapest[1].mean) / cheapest[1].mean) * 100;

        insights.push({
            type: 'regional',
            title: 'Disparidades Regionais Significativas',
            summary: `Diferença de ${spread.toFixed(1)}% entre a regional mais cara e a mais barata.`,
            details: `<p>A regional <strong>${cheapest[0]}</strong> apresenta o menor preço médio (${formatCurrency(cheapest[1].mean)}),
                      enquanto <strong>${expensive[0]}</strong> tem o maior (${formatCurrency(expensive[1].mean)}).</p>
                      <p class="mt-2">Essa diferença de <strong>${formatCurrency(expensive[1].mean - cheapest[1].mean)}</strong> por litro
                      pode representar economia significativa para quem consegue abastecer em áreas mais baratas.</p>`,
            impact: `Abastecer sempre na regional mais barata pode gerar economia de até R$ ${((expensive[1].mean - cheapest[1].mean) * 40 * 4).toFixed(2)}/mês.`
        });
    }

    const std = math.std(prices, 'unbiased');
    const mean = math.mean(prices);
    const cv = (std / mean) * 100;

    insights.push({
        type: 'variability',
        title: 'Variabilidade de Preços no Mercado',
        summary: `Coeficiente de variação de ${cv.toFixed(1)}% indica ${cv > 15 ? 'alta' : cv > 8 ? 'moderada' : 'baixa'} dispersão.`,
        details: `<p>O desvio padrão de <strong>${formatCurrency(std)}</strong> mostra que os preços ${cv > 15 ? 'variam consideravelmente' : 'são relativamente consistentes'}
                  em Belo Horizonte.</p>
                  <p class="mt-2">${cv > 15 ? '<strong>Vale a pena</strong> pesquisar preços entre diferentes postos, pois a variação é significativa.' :
                  'O mercado é relativamente homogêneo, com pequena variação entre postos.'}</p>`,
        impact: null
    });

    const sortedPrices = [...prices].sort((a, b) => a - b);
    const q1 = math.quantileSeq(sortedPrices, 0.25, false);
    const q3 = math.quantileSeq(sortedPrices, 0.75, false);
    const iqr = q3 - q1;
    const outliers = (iqr > 0) ? detectOutliers(prices, q1, q3, iqr) : [];
    const outlierPercent = (outliers.length / prices.length) * 100;

    if (outlierPercent > 2) {
        insights.push({
            type: 'outliers',
            title: 'Presença de Valores Atípicos',
            summary: `${outliers.length} outliers detectados (${outlierPercent.toFixed(1)}% dos dados).`,
            details: `<p>Valores atípicos podem indicar postos premium com serviços diferenciados, promoções temporárias,
                      ou possíveis erros de coleta.</p>
                      <p class="mt-2">Esses outliers afetam a média geral, tornando a <strong>mediana</strong> uma medida mais confiável do preço típico.</p>`,
            impact: null
        });
    }

    return {
        insights,
        summary: {
            totalRecords: allData.length,
            period: `${firstSemester} a ${lastSemester}`,
            avgPrice: mean,
            totalVariation,
            regionalsCount: Object.keys(regionalStats).length,
            fuelTypes: _.uniq(allData.map(d => d.produto)).length
        }
    };
}

function getBorderColor(type) {
    const colors = {
        trend: 'border-blue-500',
        regional: 'border-green-500',
        variability: 'border-yellow-500',
        parity: 'border-purple-500',
        outliers: 'border-red-500'
    };
    return colors[type] || 'border-gray-500';
}

function getInsightIcon(type) {
    const icons = {
        trend: 'trending-up',
        regional: 'map-pin',
        variability: 'bar-chart',
        parity: 'git-compare',
        outliers: 'alert-triangle'
    };
    return icons[type] || 'info';
}

function createSummaryCard(label, value) {
    return `<div class="bg-gray-50 p-3 rounded">
        <p class="text-gray-600 text-xs">${label}</p>
        <p class="text-lg font-bold text-gray-800">${value}</p>
    </div>`;
}

// --- Funções Auxiliares de UI (Componentes) ---
export function renderNavigation(chapters, activeChapter) {
    const navEl = document.getElementById('chapter-nav');
    navEl.innerHTML = chapters.map(c => `
        <a href="#" data-chapter="${c.id}" class="flex items-center space-x-2 px-4 py-3 border-b-2 border-transparent ${c.id === activeChapter ? 'tab-active' : 'text-gray-500 hover:text-gray-700'}">
            <i data-lucide="${c.icon}" class="h-4 w-4"></i>
            <span>${c.name}</span>
        </a>`).join('');
}

export function renderFilters(allData) {
    const filtersEl = document.getElementById('filters');
    const semesters = ['all', ..._.uniq(allData.map(d => d.semestre)).sort()];
    const regionals = ['all', ..._.uniq(allData.map(d => d.regional)).sort()];

    filtersEl.innerHTML = `
        <div>
            <label for="semester-filter" class="block text-sm font-medium text-gray-700 mb-1">Semestre</label>
            <select id="semester-filter" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
                ${semesters.map(s => `<option value="${s}">${s === 'all' ? 'Todos os Semestres' : s}</option>`).join('')}
            </select>
        </div>
        
        <div>
            <label for="regional-filter" class="block text-sm font-medium text-gray-700 mb-1">Regional</label>
            <select id="regional-filter" class="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm">
               ${regionals.map(r => `<option value="${r}">${r === 'all' ? 'Todas as Regionais' : r}</option>`).join('')}
            </select>
        </div>`;
}

export function renderGlossary() {
    const glossaryEl = document.getElementById('glossary');
    
}

function createMetricCard(title, value, tooltipText, iconName) {
    return `<div class="bg-white p-4 rounded-lg shadow has-tooltip relative metric-card">
        <div class="flex items-start justify-between">
            <div><p class="text-sm text-gray-500">${title}</p><p class="text-2xl font-bold text-gray-800">${value}</p></div>
            <div class="bg-blue-100 p-2 rounded-full">
                <i data-lucide="${iconName}" class="h-6 w-6 text-blue-600"></i>
            </div>
        </div>
        <div class="tooltip absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-gray-800 text-white text-xs rounded py-2 px-3 z-50">${tooltipText}</div>
    </div>`;
}

function createChartCard(canvasId, title, subtitle) {
    return `<div class="bg-white p-6 rounded-lg shadow flex flex-col chart-card">
        <div>
            <h3 class="text-lg font-semibold">${title}</h3>
            <p class="text-sm text-gray-500 mb-4">${subtitle}</p>
        </div>
        <div class="relative h-64 md:h-72">
            <canvas id="${canvasId}"></canvas>
        </div>
    </div>`;
}

function createSidebar(title, content) {
    return `<div class="sticky top-28">
        <h3 class="text-lg font-semibold flex items-center space-x-2 mb-4">
            <i data-lucide="book-open" class="h-5 w-5 text-blue-600"></i><span>${title}</span>
        </h3>${content}</div>`;
}

function createEmptyState() {
     return `<div class="text-center py-16 bg-white rounded-lg shadow">
        <i data-lucide="filter-x" class="h-12 w-12 mx-auto text-gray-400"></i>
        <h3 class="mt-2 text-lg font-medium text-gray-900">Nenhum dado encontrado</h3>
        <p class="mt-1 text-sm text-gray-500">Tente ajustar os filtros para visualizar os dados.</p>
    </div>`;
}




