# Análise de Combustíveis - Belo Horizonte

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/Version-4.0.0-blue.svg)](#changelog)
[![Status](https://img.shields.io/badge/Status-Active-green.svg)](#)

Uma plataforma interativa de análise estatística de preços de gasolina em Belo Horizonte, desenvolvida para trabalho acadêmico de Estatística com foco em visualização de dados e insights acionáveis.

## 🎯 Características Principais

### 📊 **Análise Estatística Completa**
- **Estatísticas Descritivas**: Média, mediana, moda, desvio padrão e coeficiente de variação
- **Distribuições**: Histogramas, box plots e análise de quartis
- **Detecção de Outliers**: Identificação automática de valores atípicos
- **Métricas de Dispersão**: IQR (Intervalo Interquartil) e análise de variabilidade

### 📈 **Análise Temporal Avançada**
- Evolução de preços por semestre (2023-2025)
- Detecção de tendências e sazonalidade
- Projeções baseadas em regressão linear
- Análise de variação percentual entre períodos
- Comparação primeiro vs. último semestre

### 🗺️ **Análise Geográfica**
- Comparação entre 9 regionais de Belo Horizonte
- Identificação de disparidades regionais
- Mapas de calor de preços por região
- Estatísticas detalhadas por regional

### 🏷️ **Análise por Bandeira**
- Comparação de preços entre bandeiras de postos
- Ranking das bandeiras mais econômicas
- Análise de postos bandeira branca vs. marcas estabelecidas
- Pódio com top 3 melhores médias

### 🔗 **Análise de Correlações**
- Correlação preço-tempo
- Paridade etanol-gasolina (quando disponível)
- Identificação de padrões e relações entre variáveis

### 💡 **Insights Automatizados**
- Sistema inteligente de geração de insights
- Recomendações baseadas em dados
- Análise de impacto financeiro para o consumidor
- Descobertas estatísticas destacadas

## 🚀 Demo Online

[**Acesse a Análise**](#) - Funciona diretamente no navegador!

## 📸 Screenshots

### Dashboard Principal
![Dashboard](docs/images/dashboard.png)

### Análise Regional
![Regional](docs/images/regional-analysis.png)

### Insights
![Insights](docs/images/insights.png)

### Estrutura de Dados

Os dados devem estar na pasta `data/` no formato CSV:
```
data/
├── combustiveis_2023_s1 - Gasolina.csv
├── combustiveis_2023_s2 - Gasolina.csv
├── combustiveis_2024_s1 - Gasolina.csv
├── combustiveis_2024_s2 - Gasolina.csv
└── combustiveis_2025_s1 - Gasolina.csv
```

## 📚 Guia de Uso

### Navegação

A interface é dividida em 7 capítulos principais:

1. **🏠 Visão Geral**: Estatísticas gerais e distribuição dos dados
2. **📊 Distribuições**: Análise estatística descritiva completa
3. **📈 Evolução Temporal**: Tendências e projeções ao longo do tempo
4. **🗺️ Análise Regional**: Comparação entre regiões de BH
5. **🏷️ Análise por Bandeira**: Comparação entre postos e marcas
6. **🔗 Correlações**: Relações entre variáveis
7. **💡 Insights**: Descobertas e recomendações automáticas

### Filtros Disponíveis

- **Semestre**: Filtre por período específico ou visualize todos
- **Regional**: Foque em uma regional específica ou compare todas

### Recursos Interativos

- **Gráficos Responsivos**: Todos os gráficos são interativos (hover para detalhes)
- **Tooltips Educativos**: Explicações contextuais sobre conceitos estatísticos
- **Cards Informativos**: Métricas destacadas com explicações
- **Tabelas Detalhadas**: Dados completos para análise aprofundada

## 🏗️ Arquitetura

### Estrutura do Projeto

```
fuel-analysis-bh/
├── index.html              # Página principal
├── css/
│   └── style.css          # Estilos customizados
├── js/
│   ├── main.js            # Aplicação principal e gerenciamento de estado
│   ├── data.js            # Carregamento e processamento de dados
│   ├── charts.js          # Criação e gerenciamento de gráficos
│   ├── ui.js              # Renderização de componentes da interface
│   └── utils.js           # Funções utilitárias e constantes
├── data/                  # Arquivos CSV com dados
├── docs/                  # Documentação adicional
└── README.md             # Este arquivo
```

### Tecnologias Utilizadas

#### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Estilização com Tailwind CSS 3.x
- **JavaScript ES6+**: Lógica da aplicação (modular)

#### Bibliotecas
- **Chart.js 4.4.3**: Visualizações interativas
- **PapaParse 5.3.2**: Parser de CSV robusto
- **Math.js 11.8.0**: Cálculos estatísticos avançados
- **Lodash 4.17.21**: Manipulação eficiente de dados
- **Lucide Icons**: Ícones modernos e consistentes
- **Chart.js Plugins**:
  - `chartjs-adapter-date-fns`: Manipulação de datas
  - `chartjs-plugin-annotation`: Linhas de referência
  - `@sgratzl/chartjs-chart-boxplot`: Box plots

## 🧪 Metodologia Estatística

### Medidas de Tendência Central
- **Média Aritmética**: Valor médio dos preços
- **Mediana**: Valor central que divide os dados ao meio
- **Moda**: Preço mais frequente

### Medidas de Dispersão
- **Desvio Padrão**: Grau de variação dos preços
- **Coeficiente de Variação**: Dispersão relativa à média (%)
- **IQR (Intervalo Interquartil)**: Q3 - Q1
- **Amplitude**: Diferença entre máximo e mínimo

### Análise de Outliers
- **Método IQR**: Valores fora de [Q1 - 1.5×IQR, Q3 + 1.5×IQR]
- **Identificação Visual**: Box plots destacam valores atípicos

### Análise de Tendência
- **Regressão Linear**: Cálculo de slope e intercept
- **Projeções**: Estimativas baseadas em tendência histórica
- **Variação Percentual**: Mudanças relativas entre períodos

### Análise de Correlação
- **Correlação de Pearson**: Mede relação linear entre variáveis
- **Interpretação**: De -1 (negativa perfeita) a +1 (positiva perfeita)

## 📊 Fonte dos Dados

Os dados são provenientes de coletas semestrais realizadas entre 2023 e 2025, contendo:
- Preços de venda de gasolina comum
- Informações de localização (bairro e regional)
- Bandeira do posto
- Data da coleta
- CNPJ da revenda

**Importante**: Os dados representam uma **amostra** dos postos de Belo Horizonte, não a população completa.

## 🎓 Uso Educacional

### Para Estudantes de Estatística

Este projeto demonstra:
- ✅ Análise exploratória de dados (EDA)
- ✅ Estatística descritiva aplicada
- ✅ Visualização de dados
- ✅ Interpretação de gráficos e métricas
- ✅ Análise de séries temporais
- ✅ Detecção de padrões e anomalias

### Conceitos Abordados

- **Amostragem**: Diferença entre amostra e população
- **Variáveis**: Categóricas (regional, bandeira) e numéricas (preço)
- **Distribuições**: Normal, assimétrica, bimodal
- **Outliers**: Identificação e interpretação
- **Correlação vs. Causalidade**: Diferenças fundamentais
- **Variância**: Entre grupos e dentro de grupos
- **Tendências**: Linear, sazonal, cíclica

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🙏 Agradecimentos

- **ANP (Agência Nacional do Petróleo)**: Fonte dos dados
- **Chart.js**: Biblioteca de visualização
- **Tailwind CSS**: Framework CSS
- **Comunidade Open Source**: Bibliotecas e ferramentas
- **Professores e Colegas**: Orientação e feedback

## 📞 Contato

- **Issues**: [GitHub Issues](https://github.com/seu-usuario/fuel-analysis-bh/issues)
- **Email**: seu-email@example.com
- **Universidade**: Trabalho desenvolvido para a disciplina de Estatística

## 📖 Referências

### Bibliografia
- BUSSAB, W. O.; MORETTIN, P. A. *Estatística Básica*. 9ª ed. São Paulo: Saraiva, 2017.
- MONTGOMERY, D. C.; RUNGER, G. C. *Estatística Aplicada e Probabilidade para Engenheiros*. 6ª ed. LTC, 2016.
