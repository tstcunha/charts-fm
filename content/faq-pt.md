## O que é Vibe Score (VS)?

O Vibe Score (VS) é um sistema de pontuação usado pra gerar os charts. Ele torna os charts mais dinâmicos e garante que os favoritos de todos os membros de uma comunidade estejam representados nos charts. Em vez de somar todas as contagens de plays de todos os usuários, o VS usa um sistema de classificação que impede que os charts sejam sempre dominados pelos ouvintes mais assíduos de música de uma comunidade.

### Como o Vibe Score é Calculado?

O VS é calculado para cada item (faixa, artista ou álbum) com base em sua posição no gráfico semanal **pessoal** de cada usuário.

Para as 100 principais itens de cada usuário, o VS usa um sistema de três níveis:

1. **Posição 1**: Recebe peso especial de **2,00 VS**
2. **Posições 2-21**: Redução linear de 0,05 por posição
   - Fórmula: `VS = 2,00 - (0,05 × (posição - 1))`
   - A posição 21 atinge 1,00 VS
3. **Posições 22-100**: Interpolação linear de 1,00 a 0,00
   - Fórmula: `VS = 1,00 × (1 - ((posição - 21) / 80))`
4. **Posição 101+**: `0,00` (itens além das 100 principais não recebem VS)

**Exemplos:**
- Posição 1: `2,00 VS` (peso especial)
- Posição 2: `2,00 - (0,05 × 1) = 1,95 VS`
- Posição 10: `2,00 - (0,05 × 9) = 1,55 VS`
- Posição 21: `2,00 - (0,05 × 20) = 1,00 VS`
- Posição 50: `1,00 × (1 - 29/80) = 0,64 VS`
- Posição 100: `1,00 × (1 - 79/80) = 0,01 VS`
- Posição 101+: `0,00` (itens além das 100 principais não recebem VS)

![Gráfico de Cálculo VS](/icons/VS_graph.png)

Ou seja: suponha que João e Maria estejam num mesmo comunidades. João escutou Lady Gaga 500 vezes em uma semana, o que a tornou asua artista mais escutada naquela semana. Maria escutou Ariana Grande apenas 50 vezes, mas ela foi a sua mais escutada daquela semana.

Mesmo que João tenha escutado Lady Gaga muito mais vezes do que Maria escutou Ariana Grande, ambas as cantoras vão receber a mesma quantidade de cada um dos ouvintes: **as duas receberão 2,00 VS**.

De forma simples, o que conta para a pontuação não é quantas vezes você escutou um artista, mas a posição dele entre os seus favoritos. A vantagem é que João, que ouve muito mais música do que todos os seus amigos, não vai dominar os charts de todos os comunidades em que está simplesmente por escutar muito mais música, e os charts serão uma representação dos favoritos de todos!

### Modos de Charts

Você não precisa usar este sistema para calcular seus charts, se não quiser. Os donos dos comunidades podem escolher entre três modos de cálculo:

#### 1. Modo VS
Soma os pontos de VS de todos os usuários para cada item. Esse é o melhor sistema para comunidades com hábitos variados, onde você quer representar igualmente os favoritos de cada membro.

**Exemplo:**
- A música #1 do Usuário A recebe 2,00 VS
- A música #5 do Usuário B recebe 1,80 VS (2,00 - 0,20)
- Se ambos os usuários ouviram a mesma música, VS total = 3,80

#### 2. Modo VS Ponderado
Neste modo, multiplicamos o VS de cada usuário por sua contagem de plays, depois somamos entre os usuários. Esse método equilibra a importância da classificação com o volume de escuta: além dos itens precisarem receber posições altas entre os membros da comunidade para entrar nos charts, também se leva em consideração a contagem de plays.

**Fórmula:** `Soma(VS × contagem de plays)` para cada item

**Exemplo:**
- Faixa #1 do Usuário A (2,00 VS) com 28 plays = 56,00 de contribuição
- Faixa #1 do Usuário B (2,00 VS) com 5 plays = 10,00 de contribuição
- VS total = 66,00

#### 3. Modo Apenas Plays
Modo tradicional - soma as contagens de plays de todos os usuários. Por consistência, o VS nesse modo será igual à contagem de plays. Este é melhor para comunidades que preferem um sistema simples e tradicional.

**Exemplo:**
- Usuário A: 28 plays
- Usuário B: 19 plays
- VS total = 47 (igual ao total de plays)

---

## Como o Match Musical é Calculado?

> **Obs:** Esta funcionalidade estará disponível em uma atualização futura. Em breve você poderá calcular o seu match musical com outros grupos!

A porcentagem de match mede o quão compatível é o seu gosto musical com os hábitos gerais de escuta de uma determinada comunidade. Essa porcentagem é calculada usando uma combinação de quatro fatores:

### 1. Sobreposição de Gênero (45% de peso)
Este é o fator mais importante. Compara os gêneros dos seus principais artistas com os principais artistas da comunidade. Aqui, são aplicados algoritmos de similaridade de gênero para descobrir o quão bem seus gêneros musicais se alinham.

### 2. Sobreposição de Artistas (25% de peso)
Compara seus principais artistas com os principais artistas de todos os tempos da comunidade. Usamos similaridade de Jaccard ponderada, onde os artistas de classificação mais alta (posições 1, 2, 3, etc.) contribuem mais para a pontuação do que os de classificação mais baixa.

### 3. Sobreposição de Músicas (20% de peso)
Compara suas principais músicas com as principais faixas de todos os tempos da comunidade. Também usa similaridade de Jaccard ponderada. **Importante:** Aplica-se uma transformação não-linear para aumentar pequenas sobreposições, já que obter uma correspondência *exata* de músicas é raro, mesmo quando as pessoas gostam dos mesmos artistas.

### 4. Padrões de Escuta (10% de peso)
Combina três subfatores:
- **Diversidade:** Proporção de artistas/faixas únicos para o total de escuta. (= se você escuta músicas e artistas variados, ou se fica mais nos mesmos)
- **Consistência:** Variância no volume de escuta semanal (= se você costuma escuta muito uma semana e pouco na outra, ou se é mais constante)
- **Recência:** Média ponderada das semanas recentes (decaimento exponencial, meia-vida de 30 dias)

### Cálculo da Pontuação Final

A pontuação final do match musical (0-100) é calculada da seguinte forma:

```
pontuação = (
  sobreposiçãoGênero × 0.45 +
  sobreposiçãoArtista × 0.25 +
  sobreposiçãoFaixa × 0.20 +
  padroesDeEscuta × 0.10
) × 100
```

**Como interpretar o resultado:**
- **70-100%:** Match excelente - altíssima compatibilidade
- **50-69%:** Match bom - compatibilidade média
- **30-49%:** Match moderado - alguma sobreposição
- **0-29%:** Match baixo - compatibilidade limitada

---

## Como os Prêmios de Membro são Decididos?

Os prêmios dos membros são calculados automaticamente e exibidos na página de recordes. Esses prêmios reconhecem diferentes tipos de contribuições e conquistas dentro de uma comunidade. Aqui estão todos os prêmios, e como os vencedores são determinados:

### Senhor do VS
O usuário que contribuiu com mais pontos totais de Vibe Score em todos os gráficos. Isso reconhece o membro cuja forma de escutar música teve o maior impacto nos charts da comunidade.

Lembre-se que cada membro dá uma pontuação de VS para todos os itens que escutou, do primeiro ao centésimo, e apenas depois disso os charts da comunidade são gerados. Nem todos os itens no top 100 de um membro aparecerão nos charts da comunidade: se você der 1,50 VS para um cantor, mas esse cantor não receber VS o suficiente dos outros membros para aparecer nos charts, o resultado é que esses 1,50 VS não impactaram no chart final

A conclusão é que membros diferentes sempre impactarão os charts da semana em pesos diferentes, com alguns tendo mais impacto (geralmente, aqueles cujo gosto se alinha melhor com o do resto da comunidade), e outros, menos.

### Potência do Flood
O membro que contribuiu com mais **plays** totais em todos os charts. Esse é o membro que ouve mais música no geral.

### Influencer
Este é o membro que contribuiu com mais itens que debutaram nos charts da comunidade. Este prêmio reconhece membros que trazem músicas novas e populares para a comunidade.

### Alternativo(a)
O membro menos mainstream - este é o membro que contribuiu com *menos* itens que debutaram nos charts (mas pelo menos 1). É um prêmio que reconhece o membro que têm os hábitos de escuta mais nichados, ou mais únicos.

### Farofeiro(a)
O usuário que contribuiu para os charts o longo de mais semanas. Este prêmio reconhece o membro que está constantemente ouvindo itens que são populares entre os outros membros da comunidade.

### Hitmaker
O membro que trouxe mais itens que, ao decorrer do tempo, chegaram na posição #1 nos charts. Esse prêmio reconhece aqueles membros que trazem música nova pra comunidade e que se torna popular.

**Nota:** Os prêmios são calculados automaticamente após a geração dos charts ser concluída. O cálculo é executado em segundo plano, e pode levar alguns momentos para ser concluído.

---

## Como o MVP da Semana é Escolhido?

O MVP da semana (*Most Valuable Player* - Jogador Mais Valioso) é o membro da comunidade que mais contribuiu para os charts da semana **atual**. Esse membro é escolhido calculando a contribuição total de cada membro, e o membro que mais deu pontos de VS para os charts da semana é o MVP. Em outras palavras, é o membro cujos favoritos mais se alinharam com os da comunidade como um todo.

### Processo de Seleção

1. **Calcular Contribuições:** Para cada membro da comunidade, some todos os pontos de Vibe Score que ele deu para todos os itens dos charts (artistas, faixas e álbuns) da semana atual.

2. **Classificar Membros:** Os membros são classificados pela sua contribuição total de VS, e o membro que contribuiu com a maior pontuação é escolhido como o MVP.

### Como Ver o MVP

O MVP da semana aparece na página e na aba **Trends**, tendo destaque proeminente no topo da seção Membros da página. Se você não for o MVP, entrando na página Trends, você pode ver como a sua contribuição total para os charts da semana se compara à dele.

---
