import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { ArrowLeft, Volume2, Check, Lock, Star, Pencil, ChevronRight, Search } from 'lucide-react';
import type { Module, Word, LessonProgress } from '@/lib/supabase';
import { supabase, LESSON_STEPS } from '@/lib/supabase';
import { speakWord, playSuccessSound, playErrorSound } from '@/lib/speech';
import { celebrate } from '@/lib/confetti';
import WordVisual from '@/components/WordVisual';

// Função auxiliar para fonética amigável
function formatFriendlyPhonetic(phonetic?: string | null): string {
  if (!phonetic) return '';
  return phonetic
    .replace(/θ/g, 'f')
    .replace(/ð/g, 'd')
    .replace(/ʃ/g, 'ch')
    .replace(/ʒ/g, 'j')
    .replace(/tʃ/g, 'tch')
    .replace(/dʒ/g, 'dj')
    .replace(/ŋ/g, 'ng')
    .replace(/æ/g, 'é')
    .replace(/ʌ/g, 'ã')
    .replace(/ə/g, 'e')
    .replace(/ɪ/g, 'i')
    .replace(/ʊ/g, 'u');
}

const CONTEXT_SENTENCES: Record<string, string> = {
  // ==========================================
  // MÓDULO 1: Primeiros Passos & Saudações
  // ==========================================
  hello: 'Quando encontro um amigo, aceno com a mão e digo _____.',
  hi: 'Um jeito bem rápido e alegre de cumprimentar alguém é dizer _____.',
  bye: 'Na hora de ir embora para casa, me despeço dizendo _____.',
  please: 'Quando quero pedir algo com muita educação, digo _____.',
  thanks: 'Depois de receber um presente ou ajuda, eu digo _____.',
  yes: 'Para concordar e responder afirmativo, eu digo _____.',
  mom: 'Quem me dá carinho, colo e me protege com amor é a minha _____.',
  dad: 'Quem brinca comigo e cuida de mim com muito amor é o meu _____.',
  brother: 'O filho dos meus pais é o meu _____.',
  sister: 'A filha dos meus pais é a minha _____.',
  baby: 'Aquele neném bem pequenininho que chora no berço é um _____.',
  family: 'O papai, a mamãe e os filhos reunidos formam uma linda _____.',
  red: 'A maçã madura e o morango têm a cor _____.',
  blue: 'O céu em um dia ensolarado tem a cor _____.',
  yellow: 'O sol brilhante lá no alto tem a cor _____.',
  green: 'A grama fresquinha e as folhas das árvores têm a cor _____.',
  pink: 'A florzinha de cerejeira e o algodão-doce têm a cor _____.',
  white: 'A nuvem fofinha no céu tem a cor _____.',
  dog: 'O animalzinho que late e abana o rabo feliz é o _____.',
  cat: 'O bichinho que mia suavemente no telhado é o _____.',
  bird: 'Aquele bichinho que canta e bate as asas no céu é um _____.',
  fish: 'O animalzinho que nada dentro da água ou o filé grelhado no almoço é o _____.',
  duck: 'A ave que faz quá-quá e nada na lagoa é o _____.',
  bee: 'O inseto listradinho que faz mel delicioso é a _____.',
  look: 'Quando vejo algo muito legal e aponto o dedo, digo para _____.',
  listen: 'Para ouvir a professora falar com atenção, eu preciso _____.',
  smile: 'Quando estou muito contente, abro um lindo _____.',
  hug: 'Para demonstrar carinho bem apertado em quem eu amo, dou um _____.',
  come: 'Quando chamo o cachorrinho para perto de mim, peço para ele _____.',
  go: 'Quando a corrida vai começar e o sinal fica verde, podemos _____.',

  // ==========================================
  // MÓDULO 2: O Alfabeto Completo (A-Z) & Sons
  // ==========================================
  apple: 'A fruta vermelha e docinha que começa com a letra A é a _____.',
  bear: 'O animal peludo e grande que dorme na floresta é o _____.',
  egg: 'No ninho da galinha ou no prato matinal, temos um _____.',
  frog: 'O bichinho verde que pula na lagoa e coaxa é o _____.',
  grape: 'A frutinha roxa ou verde que dá em cachos doces é a _____.',
  horse: 'O animal forte e elegante que corre rápido no pasto é o _____.',
  ice: 'A água bem congelada e super geladinha chama-se _____.',
  juice: 'A bebida saudável e refrescante espremida da fruta é o _____.',
  kite: 'Em dia de vento, adoro soltar no céu a minha _____.',
  lion: 'O rei da floresta com uma juba imponente é o _____.',
  monkey: 'O macaquinho engraçado que pula de galho em galho é o _____.',
  nest: 'Onde o passarinho bota os ovos com cuidado é no seu _____.',
  orange: 'A fruta redonda de suco doce e rica em vitamina C é a _____.',
  pencil: 'Para desenhar e escrever a tarefinha, eu uso o meu _____.',
  queen: 'A governante que usa coroa no castelo é a _____.',
  rabbit: 'O bichinho orelhudo que adora comer cenoura é o _____.',
  star: 'À noite no céu escuro, brilha uma linda _____.',
  tiger: 'O felino grande com listras pretas e laranjas é o _____.',
  umbrella: 'Quando começa a chover na rua, abro o meu _____.',
  violin: 'O instrumento de cordas com som suave e delicado é o _____.',
  water: 'Quando sinto muita sede no calor, bebo bastante _____.',
  box: 'Para guardar os brinquedos organizados, usamos uma _____.',
  zebra: 'O animal parecido com um cavalinho com listras pretas e brancas é a _____.',
  letter: 'Cada pedacinho que forma o alfabeto chama-se _____.',
  sound: 'Quando ouvimos uma música ou uma buzina, escutamos um _____.',
  word: 'Quando juntamos várias letrinhas, formamos uma nova _____.',
  read: 'Abrir um livro e viajar na historinha é muito bom para _____.',

  // ==========================================
  // MÓDULO 3: Meu Corpo, Rosto & Higiene
  // ==========================================
  head: 'No topo do meu corpo, onde fica o cabelo, está a minha _____.',
  eye: 'Para ver as cores e o mundo ao meu redor, uso o meu _____.',
  nose: 'Para sentir o cheiro das flores perfumadas, uso o meu _____.',
  mouth: 'Para falar, sorrir e comer comidinha gostosa, uso a minha _____.',
  ear: 'Para ouvir a música e a voz das pessoas, uso a minha _____.',
  hair: 'No alto da cabeça, penteio todos os dias o meu _____.',
  arm: 'Para dar um abraço bem forte, eu estico o meu _____.',
  hand: 'Para segurar o lápis e bater palmas, uso a minha _____.',
  finger: 'Na ponta de cada mãozinha, eu conto cada _____.',
  leg: 'Para correr rápido e caminhar pelo parque, movimento a minha _____.',
  foot: 'Onde calço o meu sapato e a minha meia é o meu _____.',
  body: 'A cabeça, os braços e as pernas fazem parte do meu _____.',
  shirt: 'Para ir à escola bem arrumado, vesti a minha _____.',
  pants: 'Para cobrir as pernas antes de sair de casa, vesti a minha _____.',
  dress: 'Para ir à festa bem bonita, ela colocou um lindo _____.',
  shoe: 'Antes de sair na rua para brincar, calcei o meu _____.',
  sock: 'Antes de colocar o tênis no pé, calcei uma quentinha _____.',
  hat: 'Para proteger a cabeça do sol quente, coloquei o meu _____.',
  soap: 'Para lavar as mãos e fazer espuma cheirosa, uso o _____.',
  towel: 'Depois de sair da água do banho, enxugo o corpo com a _____.',
  bath: 'No fim do dia para ficar bem limpinho e relaxado, tomo um gostoso _____.',
  brush: 'Para pentear os fios de cabelo ou escovar os dentinhos, pego a minha _____.',
  teeth: 'Depois das refeições, escovo com cuidado os meus _____.',
  clean: 'Depois de arrumar os brinquedos e tomar banho, fica tudo bem _____.',
  wash: 'Antes de comer o lanche, vou à pia para _____ as mãos.',
  touch: 'Para sentir a textura macia do ursinho, estico a mão para _____.',
  clap: 'Quando a música é alegre, todos começam a _____ as mãos.',
  sleep: 'Quando a noite chega e sinto cansaço, deito na cama para _____.',
  healthy: 'Comer frutas e legumes me mantém forte e muito _____.',
  strong: 'Quem pratica esportes e se alimenta bem fica super _____.',

  // ==========================================
  // MÓDULO 4: Números de 0 a 20 & Formas
  // ==========================================
  zero: 'Quando a cesta fica vazia sem nenhuma fruta, temos _____ maçãs.',
  one: 'No meu rosto, eu tenho apenas _____ nariz.',
  two: 'Para calçar os meus tênis, eu uso meus _____ pés.',
  three: 'O semáforo de trânsito tem _____ cores brilhantes.',
  four: 'A mesa de estudos tem _____ pernas de apoio.',
  five: 'Em cada uma das minhas mãos, eu conto _____ dedinhos.',
  six: 'Um inseto no jardim tem exatamente _____ patinhas.',
  seven: 'O arco-íris no céu tem _____ cores lindas.',
  eight: 'O polvo nadando no fundo do mar tem _____ tentáculos.',
  nine: 'O número que vem logo antes do dez é o _____.',
  ten: 'Juntando os dedinhos das duas mãos, temos _____ dedos.',
  eleven: 'O número que vem logo depois do dez é o _____.',
  twelve: 'Uma dúzia inteira de ovos tem _____ unidades.',
  thirteen: 'O número ímpar que vem depois do doze é o _____.',
  fourteen: 'Uma quinzena menos um dia é igual ao número _____.',
  fifteen: 'O relógio marca exatamente meia hora no minuto _____.',
  sixteen: 'Duas vezes o número oito é igual a _____.',
  seventeen: 'O número que fica entre o dezesseis e o dezoito é o _____.',
  eighteen: 'Quando completar _____ anos, já serei uma pessoa adulta.',
  nineteen: 'O último número da família dos adolescentes antes do vinte é o _____.',
  twenty: 'Somando os dedos das duas mãos e dos dois pés, temos _____ dedos.',
  number: 'Escrevi no meu caderno um _____ bem bonito.',
  count: 'Na brincadeira de esconde-esconde, fecho os olhos para _____ até dez.',
  total: 'Juntei todas as minhas figurinhas para saber qual era o _____.',
  circle: 'A bola de futebol tem o formato redondo de um _____.',
  square: 'A janela da sala tem quatro lados retos como um _____.',
  triangle: 'A fatia gostosa de pizza parece o formato de um _____.',
  more: 'Coloquei mais frutas na cesta porque quero _____ maçãs.',
  less: 'Tirei um pouco de açúcar do copo para ficar com _____ doce.',

  // ==========================================
  // MÓDULO 5: Dezenas Maiores (30 a 100) & Noções Matemáticas
  // ==========================================
  thirty: 'O mês do calendário costuma ter _____ dias.',
  forty: 'Quatro dezenas inteiras formam o número _____.',
  fifty: 'A metade exata de cem é o número _____.',
  sixty: 'Uma hora inteira no relógio tem _____ minutos.',
  seventy: 'Sete notas de dez reais juntas somam _____ reais.',
  eighty: 'Oito dezenas somadas formam o número _____.',
  ninety: 'O número de dois dígitos que vem antes do cem é o _____.',
  hundred: 'Uma centena de moedas equivale ao número _____.',
  thousand: 'Um pacote muito grande veio com um _____ de pecinhas.',
  plus: 'Na continha de somar, usamos o sinal de _____.',
  minus: 'Quando tiramos uma quantidade, fazemos uma conta de _____.',
  equal: 'Dois mais dois é _____ a quatro.',
  many: 'No céu estrelado da noite, podemos avistar _____ estrelas.',
  few: 'Na caixa restavam apenas _____ lápis de cor.',
  pair: 'Eu comprei um novo _____ de meias para os meus pés.',
  group: 'Para fazer o trabalho na escola, formamos um _____ de amigos.',
  all: 'Arrumei o meu quarto e guardei _____ os meus brinquedos.',
  none: 'Procurei no pote de doces, mas não havia restado _____ bombom.',
  big: 'O elefante no zoológico é um animal muito _____.',
  small: 'A formiguinha andando na folha é bem _____.',
  tall: 'A girafa come as folhas do alto porque é muito _____.',
  short: 'O banquinho pequeno do jardim é bastante _____.',
  heavy: 'A caixa cheia de pedras é muito _____ para carregar.',
  light: 'A pena do passarinho voa no vento porque é super _____.',
  first: 'Quem cruza a linha de chegada na frente fica em _____ lugar.',
  second: 'O número dois representa o _____ lugar no pódio.',
  third: 'Depois do segundo lugar, vem o _____ colocado.',
  next: 'Estou ansioso para saber qual será o _____ jogo.',
  last: 'O vagão final que fecha o trem é o _____.',
  start: 'O apito do juiz indicou o _____ da corrida.',

  // ==========================================
  // MÓDULO 6: Diálogo Infantil & Frases Essenciais
  // ==========================================
  'good morning': 'Ao acordar e ver o sol pela manhã, digo _____ para minha família.',
  'good afternoon': 'Depois do almoço ao encontrar meus colegas, digo _____.',
  'good night': 'Antes de fechar os olhos na cama para dormir, desejo _____.',
  welcome: 'Quando uma visita chega na nossa casa, dizemos seja _____.',
  'see you': 'Ao me despedir de um amigo até amanhã, digo _____.',
  again: 'A brincadeira estava tão divertida que quero jogar de _____.',
  sorry: 'Quando esbarro sem querer em alguém, peço _____.',
  'excuse me': 'Para passar no corredor entre duas pessoas, peço _____.',
  'no problem': 'Quando alguém me pede desculpas por um errinho bobo, eu digo _____.',
  'you are welcome': 'Quando alguém me agradece dizendo obrigado, respondo _____.',
  pardon: 'Quando não escutei direito o que falaram, peço _____.',
  alright: 'Está tudo correndo bem e sem confusão, está tudo _____.',
  who: 'Para saber qual pessoa bateu na porta, pergunto _____ é.',
  what: 'Para descobrir o que tem dentro da caixa, pergunto _____ é isso.',
  where: 'Para encontrar o brinquedo que sumiu, pergunto _____ ele está.',
  when: 'Para saber a hora exata da festa, pergunto _____ vai começar.',
  why: 'Para entender o motivo das coisas acontecerem, pergunto o _____.',
  how: 'Para aprender a montar a pecinha, pergunto _____ se faz.',
  'i like': 'Quando uma brincadeira ou fruta é gostosa, eu digo que _____.',
  'i love': 'Com muito carinho no coração pela família, digo que _____.',
  'i want': 'Para expressar o que desejo ganhar no lanche, digo que _____.',
  good: 'Fazer o bem e ajudar os coleguinhas é algo muito _____.',
  bad: 'Brigar e estragar o brinquedo dos outros é uma atitude _____.',
  maybe: 'Quando ainda não tenho certeza da resposta, digo que _____.',
  'look here': 'Para chamar a atenção de alguém para o meu desenho, digo _____.',
  'come on': 'Para animar os amigos a correrem comigo, grito _____.',
  'be quiet': 'Na hora da história na biblioteca, todos devem fazer _____.',
  'listen carefully': 'Para não errar a instrução da tarefa, todos devem _____.',
  'well done': 'Quando o coleguinha acertou tudo com capricho, dizemos parabéns e _____.',
  'try again': 'Se você errou na primeira vez, não desista e _____.',

  // ==========================================
  // MÓDULO 7: Calendário, Dias da Semana & Meses
  // ==========================================
  monday: 'O primeiro dia de aula da semana começa na _____.',
  tuesday: 'O dia que vem logo depois da segunda-feira é a _____.',
  wednesday: 'O meio da semana de estudos é a _____.',
  thursday: 'O dia que vem antes da sexta-feira é a _____.',
  day: 'O sol nasceu no horizonte para iluminar um lindo _____.',
  week: 'De domingo até sábado, completamos uma _____ inteira.',
  friday: 'O último dia de aula antes do fim de semana é a _____.',
  saturday: 'Dia de passear e brincar bastante com a família é no _____.',
  sunday: 'Dia de almoçar reunido e descansar para a semana é no _____.',
  weekend: 'Sábado e domingo juntos formam o nosso querido _____.',
  today: 'O dia em que estamos vivendo agora mesmo chama-se _____.',
  tomorrow: 'Depois que eu dormir e acordar, será o dia de _____.',
  january: 'O primeiro mês de férias do ano novo é _____.',
  february: 'O mês mais curtinho do ano é _____.',
  march: 'O terceiro mês do ano chama-se _____.',
  april: 'O mês que vem logo depois de março é _____.',
  may: 'O mês em que comemoramos o Dia das Mães é _____.',
  june: 'O mês das festas juninas e fogueiras é _____.',
  july: 'O mês das férias escolares no meio do ano é _____.',
  august: 'O mês em que comemoramos o Dia dos Pais é _____.',
  september: 'O mês em que a primavera começa florindo é _____.',
  october: 'O mês da festa alegre das crianças é _____.',
  november: 'O mês que vem logo antes do Natal é _____.',
  december: 'O mês em que montamos a árvore de Natal é _____.',
  month: 'O ano é dividido em doze partes, e cada uma é um _____.',
  year: 'Passamos por quatro estações completas ao longo de um _____.',
  calendar: 'Para ver as datas e os dias da semana, olhamos no _____.',
  birthday: 'No dia do meu _____, eu sopro as velinhas do bolo!',
  holiday: 'Não tem aula na escola hoje porque é dia de _____.',
  date: 'Escrevi no alto do meu caderno o dia, o mês e a _____ de hoje.',

  // ==========================================
  // MÓDULO 8: Café da Manhã & Rotina Matinal
  // ==========================================
  milk: 'Pela manhã no café, bebo no copo um pouco de _____.',
  banana: 'O macaquinho descascou e comeu uma gostosa _____.',
  bread: 'Para fazer um sanduíche quentinho, passei manteiga no _____.',
  butter: 'Passei na fatia de pão quentinho uma camada de _____.',
  cheese: 'O recheio amarelo e gostoso do sanduíche é o _____.',
  cereal: 'Coloquei leite na tigela para comer com o meu crocante _____.',
  toast: 'O pãozinho bem tostadinho e crocante chama-se _____.',
  cup: 'Para tomar o chocolate quentinho, seguro a alça da _____.',
  glass: 'Coloquei água geladinha para beber dentro do _____.',
  plate: 'O almoço gostoso foi servido no meio do _____.',
  spoon: 'Para tomar a sopinha ou comer o iogurte, uso a _____.',
  fork: 'Para espetar o pedacinho de legume no prato, uso o _____.',
  knife: 'Para cortar a fruta com a ajuda de um adulto, usamos a _____.',
  'wake up': 'Quando o despertador toca pela manhã, é hora de _____.',
  eat: 'Na hora do lanchinho da tarde, me sento para _____.',
  drink: 'Quando tenho sede depois de correr, pego água para _____.',
  hungry: 'Quando minha barriga ronca antes do almoço, estou com _____.',
  thirsty: 'Depois de brincar muito no sol, estou com bastante _____.',
  sweet: 'O mel e a bala de morango têm um sabor bem _____.',
  warm: 'O cobertor macio e o leite quentinho deixam o corpo _____.',
  ready: 'Coloquei o uniforme e a mochila, já estou _____ para sair.',

  // ==========================================
  // MÓDULO 9: Brinquedos & Brincadeiras
  // ==========================================
  ball: 'No jogo de futebol no campo, chutamos a _____ para fazer o gol.',
  doll: 'A menina gosta de pentear o cabelo da sua _____.',
  car: 'Para passear na rua ou correr na pista com meu carrinho, entro no _____.',
  puzzle: 'Para montar este desenho, juntei todas as peças do _____.',
  bike: 'Coloquei o capacete para pedalar na minha _____.',
  teddy: 'Para dormir abraçado e macio, pego o meu _____ de pelúcia.',
  train: 'O apito faz piuí quando passa o grande _____.',
  boat: 'Para navegar no lago calmo, coloquei na água o meu _____.',
  robot: 'Apertei o botão e acendeu as luzes do meu brinquedo _____.',
  blocks: 'Para construir uma torre alta, empilhei vários _____.',
  drum: 'Bati com as baquetas bem forte no meu _____.',
  slide: 'No parquinho da pracinha, subi a escada e escorreguei no _____.',
  swing: 'Segurei firme na corda para balançar bem alto no _____.',
  seesaw: 'Para brincar com um amigo, um sobe e o outro desce na _____.',
  sandpit: 'Com o baldinho e a pazinha, fiz castelos na _____.',
  park: 'No fim de semana fomos passear e fazer piquenique no _____.',
  bench: 'Para descansar as pernas da caminhada, me sentei no _____.',
  play: 'Adoro chamar meus vizinhos para _____ de pega-pega.',
  run: 'Para chegar primeiro na brincadeira, comecei a _____ bem rápido.',
  jump: 'Para pular corda no recreio, tenho que _____ bem alto.',
  catch: 'Joguei a bola para o alto e estiquei as mãos para _____ ela.',
  throw: 'Para arremessar a bola na cesta de basquete, preciso _____ bem alto.',
  hide: 'Na brincadeira de esconde-esconde, procuro um cantinho para me _____.',
  game: 'No videogame da sala, joguei uma divertida partida de _____.',
  toy: 'Guardei na caixa de brinquedos o meu novo _____.',
  friend: 'Na hora do recreio, adoro conversar e rir com o meu melhor _____.',
  share: 'Emprestar os brinquedos e dividir com os outros é _____.',
  fun: 'O dia no parque com a família foi uma grande _____.',
  turn: 'Na fila do escorregador, espero com paciência a minha _____.',

  // ==========================================
  // MÓDULO 10: Escola & Sala de Aula
  // ==========================================
  pen: 'A professora assinou o recadinho no caderno usando uma _____.',
  eraser: 'Quando errei a letrinha no papel, apaguei com a _____.',
  ruler: 'Para fazer um traço bem retinho no papel, usei a _____.',
  crayon: 'Para colorir o desenho com cera macia, peguei o _____.',
  glue: 'Para colar a figurinha na folha de papel, passei um pouco de _____.',
  backpack: 'Coloquei os cadernos e o estojo dentro da minha _____.',
  book: 'Antes de dormir, a mamãe leu uma historinha bonita no meu _____.',
  notebook: 'Fiz a lição de casa escrevendo nas linhas do meu _____.',
  paper: 'Desenhei um lindo sol na folha branca de _____.',
  scissors: 'Com a ajuda da professora, recortei a figura usando a _____.',
  colors: 'Abri a caixinha de guache para misturar várias _____.',
  desk: 'Na sala de aula, cada aluno senta na sua cadeira e apoia na sua _____.',
  chair: 'Para prestar atenção na explicação do professor, me sentei na _____.',
  board: 'A professora escreveu a tarefa com giz no grande _____.',
  door: 'Para entrar na sala de aula, abri a _____.',
  window: 'Abri a cortina para entrar luz e ar fresco pela _____.',
  clock: 'Para saber quanto tempo falta para o recreio, olho o relógio no _____.',
  teacher: 'Quem ensina matérias novas e cuida da turma na sala é a _____.',
  student: 'A criança que estuda e aprende coisas novas todo dia é um _____.',
  classmate: 'Quem senta na carteira ao meu lado para fazer a tarefa é o meu _____.',
  boy: 'Aquele garotinho de boné azul é um simpático _____.',
  girl: 'A garotinha com fita no cabelo é uma alegre _____.',
  write: 'Peguei o lápis com firmeza na mão para _____ meu nome.',
  draw: 'Usando a imaginação e lápis de cor, vou _____ um castelo.',
  paint: 'Peguei o pincel e a tinta colorida para _____ o desenho.',
  ask: 'Quando fico com dúvida na lição, levanto a mão para _____.',
  learn: 'Ir para a escola todos os dias é muito bom para _____ coisas novas.',

  // ==========================================
  // MÓDULO 11: Recreio, Almoço & Lanches
  // ==========================================
  rice: 'No prato do almoço brasileiro, colocamos feijão quentinho e _____.',
  beans: 'A concha da vovó serviu no meu prato uma porção de _____.',
  meat: 'O bife gostoso grelhado na frigideira é um pedaço de _____.',
  chicken: 'O filé douradinho no almoço é de carne de _____.',
  soup: 'No dia frio à noite, tomei na tigela uma quentinha _____.',
  salad: 'Com folhas verdes, tomate e azeite, preparei uma gostosa _____.',
  potato: 'Cozida ou assada no forno, adoro comer um pedaço de _____.',
  tomato: 'A fruta vermelhinha e redonda que colocamos na salada é o _____.',
  carrot: 'O coelhinho adora roer uma crocante e laranjinha _____.',
  corn: 'A espiga amarela e quentinha que comemos cozida é de _____.',
  lettuce: 'A folha verde e crocante que vai no sanduíche é o _____.',
  sandwich: 'Coloquei queijo e presunto no meio do pão para fazer um _____.',
  cookie: 'No pote da cozinha, peguei um crocante e delicioso _____.',
  cake: 'No dia da festa de aniversário, cantamos parabéns ao redor do _____.',
  pie: 'A vovó tirou do forno uma cheirosa e quentinha _____ de maçã.',
  popcorn: 'Para assistir a um filme legal na sala, estourei uma tigela de _____.',
  chips: 'Crocantes e salgadinhas no pacote, adoro comer batatinhas tipo _____.',
  'ice cream': 'Em um dia quente de verão, comprei uma casquinha de _____ bem gelado.',
  chocolate: 'O docinho marrom feito de cacau que derrete na boca é o _____.',
  fruit: 'Comer maçã, banana e melancia é incluir na dieta uma boa _____.',
  candy: 'Depois do almoço, o vovô me deu de sobremesa uma doce _____.',
  honey: 'As abelhas produzem na colmeia um docinho e dourado _____.',
  pudding: 'Com calda de caramelo dourada, comi uma fatia de _____.',
  lunch: 'A refeição gostosa que fazemos no meio do dia chama-se _____.',
  snack: 'Na hora do intervalo da escola, abri a lancheira para comer meu _____.',
  table: 'A família toda se reuniu ao redor da _____ para jantar.',
  napkin: 'Depois de comer o lanche gostoso, limpei os lábios com o _____.',
  delicious: 'O bolo quentinho que acabou de sair do forno está muito _____.',
  full: 'Depois de comer bastante no almoço, minha barriga já ficou bem _____.',

  // ==========================================
  // MÓDULO 12: Sentimentos, Emoções & Expressões
  // ==========================================
  happy: 'Quando ganho um abraço quentinho e brinco com amigos, fico muito _____.',
  excited: 'Sabendo que amanhã vou ao parque de diversões, estou super _____.',
  calm: 'Depois de respirar fundo e relaxar, meu coração ficou bem _____.',
  proud: 'Quando terminei todo o meu desenho com capricho, fiquei muito _____.',
  brave: 'Encarei o medo do escuro com coragem como um herói _____.',
  glad: 'Fiquei muito feliz e contente ao saber que você veio, estou muito _____.',
  sad: 'Quando meu brinquedo favorito quebrou, fiquei um pouco _____.',
  angry: 'Quando alguém pega as minhas coisas sem pedir, fico um pouco _____.',
  scared: 'Ao ouvir o trovão bem alto na tempestade, fiquei meio _____.',
  tired: 'Depois de correr o dia inteiro no parque, meu corpinho ficou _____.',
  sleepy: 'Quando a noite chega e começo a bocejar, estou com muito _____.',
  bored: 'Sem nenhuma brincadeira nova para fazer na chuva, fiquei meio _____.',
  hot: 'Debaixo do sol forte do meio-dia, sinto muito _____.',
  sick: 'Quando peguei um resfriado e fiquei na cama com febre, estava _____.',
  fine: 'A professora me perguntou como eu estava, e respondi que estava tudo _____.',
  dizzy: 'Depois de rodopiar bastante na roda-gigante, fiquei meio _____.',
  hurt: 'Tropecei na pedrinha da calçada e meu joelho ficou _____.',
  laugh: 'Ao ouvir uma piadinha engraçada, comecei a dar uma gostosa _____.',
  cry: 'Quando machuquei o dedinho na porta, comecei a _____.',
  yawn: 'Abrir a boquinha de sono antes de deitar é dar um longo _____.',
  shout: 'Para chamar alguém que está muito longe no campo, preciso _____.',
  whisper: 'Para contar um segredo no ouvidinho do amigo, vou _____.',
  sigh: 'Ao terminar uma tarefa difícil com alívio, dei um profundo _____.',
  love: 'O sentimento mais bonito e puro que temos pela família é o _____.',
  care: 'Cuidar de um bichinho de estimação com atenção é ter muito _____.',
  peace: 'Um ambiente tranquilo e sem brigas transmite uma sensação de _____.',
  help: 'Quando vejo alguém carregando peso, ofereço a minha _____.',
  kind: 'Ser educado, dividir os brinquedos e tratar todos bem é ser _____.',
  safe: 'Dentro de casa com os meus pais, sinto que estou totalmente _____.',

  // ==========================================
  // MÓDULO 13: Animais da Fazenda & Selva
  // ==========================================
  cow: 'O animal que vive no pasto, faz muuu e nos dá leite é a _____.',
  pig: 'O bichinho que adora brincar na lama e faz óinc é o _____.',
  sheep: 'O animalzinho fofinho coberto de lã branca é a _____.',
  goat: 'O animal que sobe nas pedras com chifrinhos na cabeça é a _____.',
  rooster: 'A ave que canta cocoricó para acordar a fazenda ao amanhecer é o _____.',
  hen: 'A ave que bota ovos fresquinhos no ninho é a _____.',
  chick: 'Aquele filhotinho amarelo que acabou de sair da casca do ovo é o _____.',
  turkey: 'A grande ave da fazenda que faz glu-glu é o _____.',
  mouse: 'O roedor pequenininho com rabo comprido que adora queijo é o _____.',
  donkey: 'O animal paciente de orelhas compridas que ajuda no transporte é o _____.',
  farm: 'O lugar no campo onde tem bichinhos, horta e trator é a _____.',
  elephant: 'O animal gigante com tromba comprida e grandes orelhas é o _____.',
  giraffe: 'O animal mais alto da natureza com pescoço comprido é a _____.',
  wolf: 'O parente selvagem do cachorro que uiva para a lua cheia é o _____.',
  fox: 'O animal esbelto e esperto de cauda peluda alaranjada é a _____.',
  deer: 'O animal elegante da floresta com galhos na cabeça é o _____.',
  hippo: 'O bicho grandalhão e pesado que adora ficar na água do rio é o _____.',
  rhino: 'O animal gigante com uma carapaça dura e um chifre no focinho é o _____.',
  zoo: 'No fim de semana fomos ver animais do mundo todo no grande _____.',
  jungle: 'A floresta tropical cheia de árvores altas e bichos selvagens é a _____.',
  tail: 'O macaquinho se pendura nos galhos usando a sua forte _____.',
  paw: 'O gatinho limpa os pelos passando no rosto a sua fofa _____.',
  fur: 'No inverno, os ursos ficam quentinhos graças ao seu grosso _____.',
  roar: 'Quando o leão fica bravo na floresta, solta um estrondoso _____.',

  // ==========================================
  // MÓDULO 14: Transportes & Veículos
  // ==========================================
  bus: 'O veículo grande que transporta muitas pessoas pela cidade é o _____.',
  bicycle: 'O veículo de duas rodas com pedais que andamos com capacete é a _____.',
  motorcycle: 'O veículo de duas rodas com motor rápido chama-se _____.',
  taxi: 'Pegamos um carro com taxímetro na rua para viajar de _____.',
  van: 'A van espaçosa que leva as crianças para a escola chama-se _____.',
  subway: 'O trem subterrâneo e veloz que anda embaixo da terra é o _____.',
  truck: 'O veículo comprido e pesado que transporta cargas pesadas é o _____.',
  tractor: 'A máquina forte com rodas grandes que ara a terra na roça é o _____.',
  ambulance: 'O veículo com sirene que socorre pessoas dodóis é a _____.',
  'police car': 'O carro com luzes azuis e vermelhas que protege a cidade é o _____.',
  airplane: 'O meio de transporte que voa acima das nuvens no céu é o _____.',
  helicopter: 'A aeronave com hélices grandes que decola em linha reta é o _____.',
  rocket: 'A espaçonave potente que sobe até a Lua e as estrelas é o _____.',
  balloon: 'O balão de ar quente colorido que flutua calmamente no céu é o _____.',
  parachute: 'O equipamento de tecido que se abre no ar para cair devagarinho é o _____.',
  pilot: 'O profissional treinado que pilota os aviões pelo céu é o _____.',
  ship: 'A embarcação enorme que navega pelos oceanos profundos é o _____.',
  submarine: 'A embarcação especial que viaja lá no fundo do mar é o _____.',
  canoe: 'A embarcação estreita que remamos no rio chama-se _____.',
  ferry: 'O barco grande que atravessa carros e pessoas pelas águas é o _____.',
  sail: 'O vento sopra forte empurrando o tecido da grande _____ do barco.',
  street: 'As casas e as calçadas ficam dos lados da movimentada _____.',
  road: 'O caminho asfaltado e longo que liga uma cidade até a outra é a _____.',
  'traffic light': 'O poste com luz verde, amarela e vermelha no cruzamento é o _____.',
  stop: 'Ao ver a plaquinha vermelha na esquina, o motorista precisa _____.',
  fast: 'O carro de corrida acelera na pista e passa super _____.',
  slow: 'A tartaruguinha caminha devagarzinho porque o seu passo é bem _____.',

  // ==========================================
  // MÓDULO 15: Parque, Jardim & Natureza
  // ==========================================
  tree: 'No meio do parque, os passarinhos cantam no galho da _____.',
  flower: 'Plantei no jardim uma cheirosa e colorida _____.',
  grass: 'Tirei os sapatos para pisar na fresquinha e verdinha _____.',
  leaf: 'No outono com o vento forte, cai da árvore uma seca _____.',
  plant: 'Coloquei terra no vasinho e reguei uma linda _____.',
  seed: 'Enterrei na terra fofa uma minúscula _____ para germinar.',
  sun: 'O dia fica bem quentinho e iluminado com o brilho do _____.',
  cloud: 'A forma branca de algodão flutuando no céu azul é uma _____.',
  rain: 'Quando o tempo fecha e caem gotas de água do céu, temos a _____.',
  wind: 'O sopro de ar que balança as copas das árvores é o _____.',
  rainbow: 'Depois que a chuva passa e o sol aparece, surge um colorido _____.',
  sky: 'O manto azul lá no alto onde voam os pássaros e aviões é o _____.',
  river: 'As águas doces e límpidas correm velozes pelo leito do _____.',
  lake: 'No meio do bosque, os patos nadam no espelho calmo do _____.',
  rock: 'Na margem do riacho, sentei para descansar sobre uma lisa _____.',
  sand: 'Na praia perto das ondas, construí um castelo com a _____.',
  mountain: 'O monte de terra e pedras mais alto da paisagem é a _____.',
  forest: 'O lugar cheio de árvores gigantes e muitos animais é a _____.',
  butterfly: 'Com asinhas coloridas, voa de flor em flor uma linda _____.',
  ant: 'A minúscula operária que carrega folhas para o formigueiro é a _____.',
  ladybug: 'O besourinho redondinho vermelho com pintinhas pretas é a _____.',
  spider: 'A criaturinha de oito patinhas que tece uma teia no galho é a _____.',
  worm: 'O bichinho compridinho que rasteja no solo fofo da horta é a _____.',
  snail: 'O bichinho vagaroso que carrega uma conchinha nas costas é o _____.',
  walk: 'Nos fins de tarde na pracinha, gosto de sair para caminhar e _____.',
  climb: 'Segurando nos apoios com cuidado, o menino começou a _____ a árvore.',
  smell: 'Aproximei o nariz da rosinha vermelha para sentir o bom _____.',
  nature: 'Cuidar das florestas, rios e animais é preservar a linda _____.',
  fresh: 'O ar puro da montanha e as folhas da horta são muito _____.',
  shade: 'Embaixo da grande copa da árvore, descansamos na boa _____ fresca.',
};

// Gera frase específica e contextual para qualquer palavra
function getContextSentence(word: Word): string {
  const key = word.word_en.trim().toLowerCase();
  if (CONTEXT_SENTENCES[key]) {
    return CONTEXT_SENTENCES[key];
  }
  return `No dia a dia, quando falamos sobre "${word.word_pt.toLowerCase()}", usamos a palavra _____ em inglês.`;
}

type LessonRunnerProps = {
  module: Module;
  lessonDay: number;
  profileId: string;
  profileName: string;
  existingProgress: LessonProgress | null;
  onBack: () => void;
  onComplete: () => void;
  onStarsUpdated: () => void;
  profileStars: number;
};

const STEP_DURATION = 15 * 60;
const PARENT_PIN = '1234';
const LESSON_BONUS = 20;

export default function LessonRunner({
  module,
  lessonDay,
  profileId,
  profileName,
  existingProgress,
  onBack,
  onComplete,
  onStarsUpdated,
  profileStars,
}: LessonRunnerProps) {
  const isExam = lessonDay === 6;
  const [words, setWords] = useState<Word[]>([]);
  const [moduleAllWords, setModuleAllWords] = useState<Word[]>([]);
  const [currentStep, setCurrentStep] = useState(existingProgress?.current_step || 1);
  const [timeLeft, setTimeLeft] = useState(STEP_DURATION);
  const [stepDone, setStepDone] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(true);
  const [parentPin, setParentPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const [lessonComplete, setLessonComplete] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    (async () => {
      setLoading(true);

      const { data: allModWords } = await supabase
        .from('words')
        .select('*')
        .eq('module_id', module.id)
        .order('word_order', { ascending: true });

      const typedAllWords = (allModWords as Word[]) || [];
      if (isMountedRef.current) {
        setModuleAllWords(typedAllWords);
      }

      if (isExam) {
        if (isMountedRef.current) setWords(typedAllWords);
      } else {
        let targetLessonId: string | null = null;
        if (lessonDay) {
          const { data: lessonData } = await supabase
            .from('lessons')
            .select('id')
            .eq('module_id', module.id)
            .eq('lesson_day', lessonDay)
            .maybeSingle();

          if (lessonData?.id) targetLessonId = lessonData.id;
        }

        let query = supabase.from('words').select('*').order('word_order', { ascending: true });
        if (targetLessonId) {
          query = query.eq('lesson_id', targetLessonId);
        } else {
          query = query.eq('module_id', module.id);
        }

        const { data, error } = await query;
        let dailyWords: Word[] = [];

        if (!error && data && data.length > 0) {
          dailyWords = data as Word[];
        } else if (typedAllWords.length > 0) {
          dailyWords = typedAllWords;
        }

        // Garante no máximo 7 palavras e no mínimo 5 por dia
        if (dailyWords.length > 7) {
          dailyWords = dailyWords.slice(0, 7);
        } else if (dailyWords.length < 5 && typedAllWords.length >= 5) {
          const needed = 5 - dailyWords.length;
          const extras = typedAllWords
            .filter((tw) => !dailyWords.some((dw) => dw.id === tw.id))
            .slice(0, needed);
          dailyWords = [...dailyWords, ...extras];
        }

        if (isMountedRef.current) {
          setWords(dailyWords);
        }
      }

      if (isMountedRef.current) setLoading(false);
    })();
  }, [module.id, lessonDay, isExam]);

  useEffect(() => {
    if (isExam) return;
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [currentStep, isExam]);

  const saveProgress = useCallback(
    async (step: number, status: 'in_progress' | 'completed' = 'in_progress') => {
      if (existingProgress?.id) {
        await supabase
          .from('lesson_progress')
          .update({ current_step: step, status })
          .eq('id', existingProgress.id);
      } else {
        const { data } = await supabase
          .from('lesson_progress')
          .upsert(
            {
              profile_id: profileId,
              module_id: module.id,
              lesson_day: lessonDay,
              current_step: step,
              status,
            },
            { onConflict: 'profile_id,module_id,lesson_day' }
          )
          .select('*')
          .single();
        if (data) existingProgress = data as LessonProgress;
      }
    },
    [existingProgress, profileId, module.id, lessonDay]
  );

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  }

  function completeStep(step: number) {
    setStepDone((prev) => new Set(prev).add(step));
    playSuccessSound();
    if (step < 4) {
      saveProgress(step + 1);
      setTimeout(() => {
        if (isMountedRef.current) {
          setCurrentStep(step + 1);
          setTimeLeft(STEP_DURATION);
        }
      }, 600);
    }
  }

  async function finishLesson(customScoreBonus?: number) {
    const bonusToAward = customScoreBonus !== undefined ? customScoreBonus : LESSON_BONUS;
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      localStorage.setItem(`daily_done_${profileId}_${todayStr}`, 'true');
      localStorage.setItem(`lesson_completed_${profileId}_${module.id}_${lessonDay}`, 'true');
    } catch (e) {
      console.warn('Erro ao salvar no localStorage:', e);
    }

    try {
      const payload = {
        profile_id: profileId,
        user_id: profileId,
        module_id: String(module.id),
        lesson_day: Number(lessonDay),
        current_step: 4,
        status: 'completed',
        completed_at: new Date().toISOString(),
      };

      if (existingProgress?.id) {
        await supabase
          .from('lesson_progress')
          .update({
            status: 'completed',
            completed_at: new Date().toISOString(),
            current_step: 4,
            user_id: profileId,
          })
          .eq('id', existingProgress.id);
      } else {
        await supabase
          .from('lesson_progress')
          .upsert(payload, { onConflict: 'profile_id,module_id,lesson_day' });
      }
    } catch (err) {
      console.error('Exceção ao salvar lesson_progress:', err);
    }

    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('streak_days, last_activity_date, stars, monthly_stars')
        .eq('id', profileId)
        .maybeSingle();

      const newStreak = (profileData?.streak_days || 0) + 1;
      const newStars = (profileData?.stars || profileStars) + bonusToAward;
      const newMonthlyStars = (profileData?.monthly_stars || 0) + bonusToAward;

      await supabase
        .from('profiles')
        .update({
          stars: newStars,
          monthly_stars: newMonthlyStars,
          streak_days: newStreak,
          last_activity_date: todayStr,
        })
        .eq('id', profileId);
    } catch (err) {
      console.warn('Erro ao atualizar estrelas do perfil:', err);
    }

    try {
      onStarsUpdated();
    } catch (e) {}

    celebrate();
    if (isMountedRef.current) {
      setLessonComplete(true);
    }
  }

  function handleParentApprove(e: React.FormEvent) {
    e.preventDefault();
    if (parentPin === PARENT_PIN) {
      setShowPinModal(false);
      setPinError('');
      finishLesson();
    } else {
      setPinError('PIN errado! O código padrão é 1234');
      setParentPin('');
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-4xl animate-bounce">📚</div>
      </div>
    );
  }

  if (isExam) {
    return (
      <WeeklyExamRunner
        words={words}
        moduleTitle={module.title || module.title_pt}
        onBack={onBack}
        onFinishExam={async (_score, earnedStars) => {
          await finishLesson(earnedStars);
          onComplete();
        }}
      />
    );
  }

  if (lessonComplete) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 text-center">
        <div className="bg-white rounded-3xl shadow-xl p-10 border-2 border-slate-100">
          <div className="text-7xl mb-4">🏆</div>
          <h2 className="text-3xl font-extrabold text-slate-800 mb-2">Aula Concluída!</h2>
          <p className="text-xl text-slate-500 mb-4">Parabéns, {profileName}!</p>
          <div className="bg-amber-50 rounded-2xl p-4 mb-6 inline-flex items-center gap-2 border border-amber-200">
            <Star className="w-6 h-6 text-amber-500 fill-current" />
            <span className="text-2xl font-extrabold text-amber-600">+{LESSON_BONUS}</span>
            <span className="text-slate-600 font-bold">pontos ganhos</span>
          </div>

          <div>
            <button
              onClick={onComplete}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all cursor-pointer text-base"
            >
              Voltar aos Módulos
            </button>
          </div>
        </div>
      </div>
    );
  }

  const stepInfo = LESSON_STEPS[currentStep - 1] || { emoji: '⭐', title: 'Passo', subtitle: 'Atividade', duration: 15 };
  const timerProgress = ((STEP_DURATION - timeLeft) / STEP_DURATION) * 100;

  return (
    <div className="w-full max-w-5xl mx-auto px-4 md:px-8 py-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          Sair da Aula
        </button>
        <div className="text-center">
          <p className="font-extrabold text-slate-800 text-lg">Aula {lessonDay}: {module.title || module.title_pt}</p>
          <span className="text-xs text-slate-400 font-semibold">{module.title_en}</span>
        </div>
        <div className="w-16" />
      </div>

      <div className="flex items-center justify-center gap-3 mb-5">
        {LESSON_STEPS.map((s, i) => {
          const stepNum = i + 1;
          const done = stepDone.has(stepNum);
          const active = stepNum === currentStep;
          const canAccess = done || stepNum === currentStep;

          return (
            <div key={s.step || i} className="flex items-center">
              <button
                onClick={() => {
                  if (canAccess) setCurrentStep(stepNum);
                }}
                disabled={!canAccess}
                className={`w-11 h-11 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                  done
                    ? 'bg-emerald-500 text-white cursor-pointer shadow-sm'
                    : active
                    ? 'bg-indigo-600 text-white shadow-md scale-105'
                    : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                }`}
              >
                {done ? <Check className="w-5 h-5" /> : stepNum}
              </button>
              {i < LESSON_STEPS.length - 1 && (
                <div className={`w-6 md:w-10 h-1.5 mx-1.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-slate-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3.5">
            <span className="text-3xl">{stepInfo.emoji}</span>
            <div>
              <p className="font-extrabold text-slate-800 text-base">Passo {currentStep}: {stepInfo.title}</p>
              <p className="text-xs text-slate-400 font-medium">{stepInfo.subtitle}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-3xl font-black ${timeLeft < 60 ? 'text-rose-500' : 'text-indigo-600'}`}>
              {formatTime(timeLeft)}
            </div>
            <p className="text-xs text-slate-400 font-semibold">{stepInfo.duration} min</p>
          </div>
        </div>
        <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              timeLeft < 60 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-sky-400'
            }`}
            style={{ width: `${timerProgress}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-md border border-slate-100 p-8 md:p-12 min-h-[420px] flex flex-col justify-center">
        {currentStep === 1 && <Step1Flashcards words={words} onComplete={() => completeStep(1)} />}
        {currentStep === 2 && <Step2Offline words={words} onComplete={() => completeStep(2)} />}
        {currentStep === 3 && (
          <Step3MiniGames 
            words={words} 
            poolWords={words} 
            onComplete={() => completeStep(3)} 
          />
        )}
        {currentStep === 4 && <Step4RealChallenge words={words} onShowPin={() => setShowPinModal(true)} />}
      </div>

      {showPinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" onClick={() => setShowPinModal(false)}>
          <div className="bg-white rounded-3xl shadow-2xl p-6 w-full max-w-xs border border-slate-100" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-2">
                <Lock className="w-6 h-6" />
              </div>
              <h3 className="font-extrabold text-slate-800 text-lg">Confirmação dos Pais</h3>
              <p className="text-xs text-slate-400 mt-1">A criança completou a missão real em casa?</p>
            </div>
            <form onSubmit={handleParentApprove}>
              <input
                type="password"
                value={parentPin}
                onChange={(e) => setParentPin(e.target.value)}
                maxLength={4}
                inputMode="numeric"
                placeholder="••••"
                className="w-full text-center text-3xl tracking-[0.3em] font-black rounded-2xl border-2 border-slate-200 focus:border-indigo-500 outline-none py-3 mb-3 bg-slate-50"
                autoFocus
              />
              {pinError && <p className="text-rose-500 text-xs font-bold text-center mb-3">{pinError}</p>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setShowPinModal(false)} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3 rounded-2xl transition-all">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-2xl shadow transition-all cursor-pointer">
                  Aprovar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* ==================== PASSO 3: CIRCUITO DE 4 MINIJOGOS ==================== */
function Step3MiniGames({ 
  words, 
  poolWords, 
  onComplete 
}: { 
  words: Word[]; 
  poolWords: Word[]; 
  onComplete: () => void 
}) {
  const [currentGame, setCurrentGame] = useState<1 | 2 | 3 | 4>(1);
  const [game1Done, setGame1Done] = useState(false);
  const [game2Done, setGame2Done] = useState(false);
  const [game3Done, setGame3Done] = useState(false);
  const [game4Done, setGame4Done] = useState(false);

  const randomizedLessonWords = useMemo(() => {
    return [...words].sort(() => Math.random() - 0.5);
  }, [words]);

  const memoryWords = useMemo(() => {
    if (randomizedLessonWords.length >= 4) {
      return randomizedLessonWords.slice(0, 6);
    }
    return poolWords.slice(0, 4);
  }, [randomizedLessonWords, poolWords]);

  if (!words || words.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-slate-400 font-bold mb-4">Avançando exercícios...</p>
        <button onClick={onComplete} className="bg-indigo-600 text-white font-bold px-8 py-3 rounded-2xl cursor-pointer">
          Avançar
        </button>
      </div>
    );
  }

  if (game1Done && game2Done && game3Done && game4Done) {
    return (
      <div className="text-center py-6 max-w-md mx-auto">
        <div className="text-7xl mb-3 animate-bounce">🏆</div>
        <h3 className="text-2xl font-black text-slate-800 mb-1">Circuito Concluído!</h3>
        <p className="text-slate-500 font-semibold text-sm mb-6">
          Você superou todos os 4 minijogos com sucesso!
        </p>
        <button
          onClick={onComplete}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-extrabold py-4 px-8 rounded-2xl shadow-lg hover:scale-102 active:scale-95 transition-all cursor-pointer text-base"
        >
          Avançar para o Desafio com os Pais ➔
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl mx-auto py-2">
      <div className="flex items-center justify-center gap-1.5 md:gap-2 mb-6 flex-wrap">
        <span className={`px-3 py-1 rounded-full text-xs font-black ${currentGame === 1 ? 'bg-indigo-600 text-white' : game1Done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {game1Done ? '✔ 1. Escuta' : '1. Escuta'}
        </span>
        <span className="text-slate-300 font-bold">➔</span>
        <span className={`px-3 py-1 rounded-full text-xs font-black ${currentGame === 2 ? 'bg-purple-600 text-white' : game2Done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {game2Done ? '✔ 2. Memória' : '2. Memória'}
        </span>
        <span className="text-slate-300 font-bold">➔</span>
        <span className={`px-3 py-1 rounded-full text-xs font-black ${currentGame === 3 ? 'bg-amber-600 text-white' : game3Done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {game3Done ? '✔ 3. Escrever' : '3. Escrever'}
        </span>
        <span className="text-slate-300 font-bold">➔</span>
        <span className={`px-3 py-1 rounded-full text-xs font-black ${currentGame === 4 ? 'bg-sky-600 text-white' : game4Done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
          {game4Done ? '✔ 4. Balões' : '4. Balões'}
        </span>
      </div>

      {currentGame === 1 && (
        <SubGameListening
          words={randomizedLessonWords}
          poolWords={poolWords}
          onFinish={() => {
            setGame1Done(true);
            setCurrentGame(2);
            playSuccessSound();
          }}
        />
      )}

      {currentGame === 2 && (
        <SubGameMemory
          key="subgame-memory-fixed"
          words={memoryWords}
          onFinish={() => {
            setGame2Done(true);
            setCurrentGame(3);
            playSuccessSound();
          }}
        />
      )}

      {currentGame === 3 && (
        <SubGameSpelling
          words={randomizedLessonWords.slice(0, 3)}
          onFinish={() => {
            setGame3Done(true);
            setCurrentGame(4);
            playSuccessSound();
          }}
        />
      )}

      {currentGame === 4 && (
        <SubGameBalloon
          words={randomizedLessonWords}
          poolWords={poolWords}
          onFinish={() => {
            setGame4Done(true);
            playSuccessSound();
            celebrate();
          }}
        />
      )}
    </div>
  );
}

/* ==================== SUB-JOGO 1: ESCUTA E ENCONTRA ==================== */
function SubGameListening({ 
  words, 
  poolWords, 
  onFinish 
}: { 
  words: Word[]; 
  poolWords: Word[]; 
  onFinish: () => void 
}) {
  const [round, setRound] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [options, setOptions] = useState<Word[]>([]);
  const isTransitioning = useRef(false);

  const target = words[round];

  useEffect(() => {
    if (!target) {
      onFinish();
      return;
    }

    const wrong = poolWords
      .filter((w) => w.id !== target.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    setOptions([target, ...wrong].sort(() => Math.random() - 0.5));
    setSelectedId(null);
    setAnswered(false);
    isTransitioning.current = false;

    const timer = setTimeout(() => speakWord(target.word_en), 250);
    return () => clearTimeout(timer);
  }, [round, target?.id]);

  const handlePick = (w: Word) => {
    if (answered || isTransitioning.current) return;
    isTransitioning.current = true;
    setSelectedId(w.id);
    setAnswered(true);

    if (w.id === target.id) {
      playSuccessSound();
    }

    setTimeout(() => {
      if (round + 1 < words.length) {
        setRound((r) => r + 1);
      } else {
        onFinish();
      }
    }, 900);
  };

  if (!target) return null;

  return (
    <div className="bg-indigo-50/60 border-2 border-indigo-100 rounded-3xl p-6 text-center">
      <span className="text-xs font-bold text-indigo-700 uppercase tracking-widest">
        Fase 1 • Escuta & Figura ({round + 1}/{words.length})
      </span>

      <button
        onClick={() => speakWord(target.word_en)}
        className="w-20 h-20 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-lg mx-auto my-4 active:scale-95 transition-all cursor-pointer"
      >
        <Volume2 className="w-10 h-10" />
      </button>

      <h4 className="text-xl font-black text-slate-700 mb-5">"{target.word_en}"</h4>

      <div className="grid grid-cols-2 gap-3.5">
        {options.map((opt) => {
          const isCorrect = opt.id === target.id;
          const isSelected = selectedId === opt.id;
          let btnStyle = 'border-slate-200 bg-white hover:border-indigo-400 text-slate-800';

          if (answered) {
            if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 shadow-sm';
            else if (isSelected) btnStyle = 'border-rose-400 bg-rose-50 text-rose-700 opacity-60';
            else btnStyle = 'border-slate-100 bg-slate-50 text-slate-300 opacity-30';
          }

          return (
            <button
              key={opt.id}
              onClick={() => handlePick(opt)}
              disabled={answered}
              className={`p-4 rounded-2xl border-2 font-bold transition-all cursor-pointer flex flex-col items-center justify-center gap-1 shadow-xs active:scale-95 ${btnStyle}`}
            >
              <WordVisual word={opt} size="md" />
              <span className="text-xs font-extrabold mt-1">{opt.word_pt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== SUB-JOGO 2: SUPER MEMÓRIA ==================== */
function SubGameMemory({ words, onFinish }: { words: Word[]; onFinish: () => void }) {
  type Card = { uid: string; word: Word; flipped: boolean; matched: boolean };

  const [cards, setCards] = useState<Card[]>(() => {
    const deck: Card[] = [];
    words.forEach((w) => {
      deck.push({ uid: `${w.id}-1`, word: w, flipped: false, matched: false });
      deck.push({ uid: `${w.id}-2`, word: w, flipped: false, matched: false });
    });
    return deck.sort(() => Math.random() - 0.5);
  });

  const isCheckingRef = useRef(false);

  const handleCardClick = (card: Card) => {
    if (card.flipped || card.matched || isCheckingRef.current) return;

    const flippedCards = cards.filter((c) => c.flipped && !c.matched);
    if (flippedCards.length >= 2) return;

    speakWord(card.word.word_en);

    const updatedCards = cards.map((c) => (c.uid === card.uid ? { ...c, flipped: true } : c));
    setCards(updatedCards);

    if (flippedCards.length === 1) {
      const firstCard = flippedCards[0];
      isCheckingRef.current = true;

      if (firstCard.word.id === card.word.id) {
        playSuccessSound();
        setTimeout(() => {
          setCards((prev) => {
            const next = prev.map((c) =>
              c.word.id === card.word.id ? { ...c, matched: true, flipped: true } : c
            );
            if (next.every((c) => c.matched)) {
              setTimeout(onFinish, 700);
            }
            return next;
          });
          isCheckingRef.current = false;
        }, 500);
      } else {
        setTimeout(() => {
          setCards((prev) =>
            prev.map((c) => (c.matched ? c : { ...c, flipped: false }))
          );
          isCheckingRef.current = false;
        }, 900);
      }
    }
  };

  return (
    <div className="bg-purple-50/70 border-2 border-purple-100 rounded-3xl p-5 md:p-8 text-center max-w-lg mx-auto shadow-xs">
      <span className="text-xs font-black text-purple-700 bg-purple-100 px-3 py-1 rounded-full uppercase tracking-wider">
        Fase 2 • Super Memória ({cards.length / 2} pares)
      </span>
      <p className="text-xs font-bold text-slate-400 mt-2 mb-6">
        Encontre os pares das palavras de hoje!
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4 w-full">
        {cards.map((c) => (
          <button
            key={c.uid}
            onClick={() => handleCardClick(c)}
            className={`w-full aspect-square rounded-2xl sm:rounded-3xl border-2 flex flex-col items-center justify-center p-2 transition-all duration-200 cursor-pointer ${
              c.flipped || c.matched
                ? 'bg-white border-purple-400 shadow-md scale-102 ring-2 ring-purple-100'
                : 'bg-gradient-to-br from-purple-500 via-indigo-500 to-indigo-600 border-purple-300 shadow-sm hover:shadow-md hover:scale-103 active:scale-95 text-white'
            }`}
          >
            {c.flipped || c.matched ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <WordVisual word={c.word} size="md" />
                <span className="text-[11px] sm:text-xs font-black text-slate-800 mt-1.5 truncate max-w-full px-1">
                  {c.word.word_en}
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full w-full select-none">
                <span className="text-2xl sm:text-3xl font-black text-white/90 drop-shadow-xs">
                  ❓
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ==================== SUB-JOGO 3: OUVE & ESCREVE ==================== */
function SubGameSpelling({ words, onFinish }: { words: Word[]; onFinish: () => void }) {
  const [round, setRound] = useState(0);
  const [pickedIndices, setPickedIndices] = useState<number[]>([]);
  const [scramble, setScramble] = useState<{ id: number; char: string }[]>([]);
  const [feedback, setFeedback] = useState<'idle' | 'success' | 'error'>('idle');
  const isTransitioning = useRef(false);

  const target = words[round];
  const targetClean = target ? target.word_en.toUpperCase().replace(/[^A-Z]/g, '') : '';

  useEffect(() => {
    if (!target) {
      onFinish();
      return;
    }
    const chars = targetClean.split('').map((char, index) => ({ id: index, char }));
    setScramble(chars.sort(() => Math.random() - 0.5));
    setPickedIndices([]);
    setFeedback('idle');
    isTransitioning.current = false;

    const timer = setTimeout(() => speakWord(target.word_en), 250);
    return () => clearTimeout(timer);
  }, [round, target?.id, targetClean]);

  const handlePickLetter = (idx: number) => {
    if (pickedIndices.includes(idx) || feedback === 'success' || isTransitioning.current) return;
    setPickedIndices((prev) => [...prev, idx]);
  };

  const handleRemoveLetter = () => {
    if (pickedIndices.length === 0 || feedback === 'success' || isTransitioning.current) return;
    setPickedIndices((prev) => prev.slice(0, -1));
  };

  const handleCheckSpelling = () => {
    if (isTransitioning.current) return;
    const currentWord = pickedIndices
      .map((i) => scramble[i]?.char || '')
      .join('');

    if (currentWord === targetClean) {
      isTransitioning.current = true;
      setFeedback('success');
      playSuccessSound();
      setTimeout(() => {
        if (round + 1 < words.length) {
          setRound((r) => r + 1);
        } else {
          onFinish();
        }
      }, 1000);
    } else {
      setFeedback('error');
      playErrorSound();
      setTimeout(() => {
        setPickedIndices([]);
        setFeedback('idle');
      }, 800);
    }
  };

  if (!target) return null;

  return (
    <div className="bg-amber-50/70 border-2 border-amber-200 rounded-3xl p-6 text-center max-w-lg mx-auto shadow-xs">
      <span className="text-xs font-black text-amber-800 bg-amber-200/80 px-3 py-1 rounded-full uppercase tracking-wider">
        Fase 3 • Ouve & Escreve ({round + 1}/{words.length})
      </span>

      <div className="my-4">
        <button
          onClick={() => speakWord(target.word_en)}
          className="w-18 h-18 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg mx-auto active:scale-95 transition-all cursor-pointer"
        >
          <Volume2 className="w-9 h-9" />
        </button>
        <div className="flex items-center justify-center gap-2 mt-2.5">
          <p className="text-xs text-slate-500 font-bold">
            Significado: <strong className="text-slate-800">{target.word_pt}</strong>
          </p>
          <WordVisual word={target} size="sm" />
        </div>
      </div>

      <div className="flex justify-center gap-2 sm:gap-2.5 my-6 flex-wrap">
        {Array.from({ length: targetClean.length }).map((_, i) => {
          const letterIdx = pickedIndices[i];
          const char = letterIdx !== undefined && scramble[letterIdx] ? scramble[letterIdx]?.char : '';

          return (
            <div
              key={i}
              onClick={i === pickedIndices.length - 1 ? handleRemoveLetter : undefined}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl border-2 flex items-center justify-center font-black text-xl sm:text-2xl transition-all ${
                char
                  ? feedback === 'success'
                    ? 'border-emerald-500 bg-emerald-100 text-emerald-800 shadow-sm'
                    : feedback === 'error'
                    ? 'border-rose-400 bg-rose-100 text-rose-800 shadow-sm'
                    : 'border-amber-500 bg-white text-amber-800 shadow-xs cursor-pointer hover:border-rose-400'
                  : 'border-dashed border-slate-300 bg-white/60'
              }`}
            >
              {char}
            </div>
          );
        })}
      </div>

      <div className="flex justify-center gap-2 sm:gap-2.5 flex-wrap mb-6">
        {scramble.map((item, idx) => {
          const isUsed = pickedIndices.includes(idx);
          return (
            <button
              key={item?.id ?? idx}
              onClick={() => handlePickLetter(idx)}
              disabled={isUsed || feedback === 'success'}
              className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl font-black text-lg sm:text-xl border-2 transition-all duration-150 ${
                isUsed
                  ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed'
                  : 'border-amber-300 bg-white text-amber-900 shadow-sm hover:border-amber-500 hover:scale-105 active:scale-95 cursor-pointer'
              }`}
            >
              {item?.char || ''}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleRemoveLetter}
          disabled={pickedIndices.length === 0 || feedback === 'success'}
          className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs cursor-pointer transition-all disabled:opacity-40"
        >
          ⌫ Apagar
        </button>
        <button
          type="button"
          onClick={handleCheckSpelling}
          disabled={pickedIndices.length !== targetClean.length || feedback === 'success'}
          className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm ${
            pickedIndices.length === targetClean.length && feedback !== 'success'
              ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer active:scale-95'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          Conferir Palavra ✔
        </button>
      </div>
    </div>
  );
}

/* ==================== SUB-JOGO 4: BALÃO MÁGICO ==================== */
function SubGameBalloon({ 
  words, 
  poolWords, 
  onFinish 
}: { 
  words: Word[]; 
  poolWords: Word[]; 
  onFinish: () => void 
}) {
  const [round, setRound] = useState(0);
  const [poppedId, setPoppedId] = useState<string | null>(null);
  const [options, setOptions] = useState<Word[]>([]);
  const isTransitioning = useRef(false);

  const target = words[round];

  useEffect(() => {
    if (!target) {
      onFinish();
      return;
    }
    const wrong = poolWords
      .filter((w) => w.id !== target.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 2);

    setOptions([target, ...wrong].sort(() => Math.random() - 0.5));
    setPoppedId(null);
    isTransitioning.current = false;

    const timer = setTimeout(() => speakWord(target.word_en), 250);
    return () => clearTimeout(timer);
  }, [round, target?.id]);

  const handlePop = (item: Word) => {
    if (poppedId || isTransitioning.current) return;
    setPoppedId(item.id);

    if (item.id === target.id) {
      isTransitioning.current = true;
      playSuccessSound();
      setTimeout(() => {
        if (round + 1 < words.length) {
          setRound((r) => r + 1);
        } else {
          onFinish();
        }
      }, 700);
    } else {
      playErrorSound();
      setTimeout(() => setPoppedId(null), 600);
    }
  };

  if (!target) return null;

  return (
    <div className="bg-sky-50/60 border-2 border-sky-100 rounded-3xl p-6 text-center">
      <span className="text-xs font-bold text-sky-700 uppercase tracking-widest">
        Fase 4 • Estoure o Balão ({round + 1}/{words.length})
      </span>

      <h4 className="text-lg font-black text-slate-800 mt-3 mb-1">
        Qual é o balão de: <span className="text-sky-600">"{target.word_en}"</span>?
      </h4>

      <button
        onClick={() => speakWord(target.word_en)}
        className="inline-flex items-center gap-1 text-sky-600 bg-white border border-sky-200 text-xs font-bold px-3 py-1 rounded-full cursor-pointer hover:bg-sky-100 mb-5"
      >
        <Volume2 className="w-3.5 h-3.5" /> Ouvir som
      </button>

      <div className="flex justify-around items-center my-4">
        {options.map((opt) => {
          const isPopped = poppedId === opt.id;
          const isCorrect = opt.id === target.id;

          return (
            <button
              key={opt.id}
              onClick={() => handlePop(opt)}
              className={`w-24 h-32 rounded-full border-4 shadow-md flex flex-col items-center justify-center transition-all cursor-pointer ${
                isPopped
                  ? isCorrect
                    ? 'scale-110 bg-emerald-200 border-emerald-400 rotate-6'
                    : 'opacity-40 border-rose-300 bg-rose-50'
                  : 'bg-white hover:scale-105 border-sky-300 animate-bounce'
              }`}
              style={{ animationDuration: '2.5s' }}
            >
              <WordVisual word={opt} size="md" />
              <span className="text-xs font-bold text-slate-600 mt-1">{opt.word_pt}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ==================== PASSOS 1, 2 E 4 ==================== */
function Step1Flashcards({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const [idx, setIdx] = useState(0);
  const word = words[idx] || { word_en: 'HELLO', word_pt: 'Olá', emoji: '👋', phonetic: '(hé-lou)' };
  const isLast = idx >= words.length - 1;

  return (
    <div className="text-center py-4 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">🔊 Flashcards & Pronúncia</h3>
      <p className="text-slate-400 text-base mb-8">Toca para ouvir o áudio e repete bem alto!</p>

      <div className="flex justify-center mb-6">
        <WordVisual word={word} size="xl" />
      </div>
      <h2 className="text-5xl md:text-6xl font-black text-slate-800 tracking-wide mb-2">{word.word_en}</h2>
      <p className="text-2xl text-indigo-600 font-bold mb-1">{word.word_pt}</p>
      <p className="text-slate-400 font-medium text-base mb-8">{formatFriendlyPhonetic(word.phonetic)}</p>

      <button
        onClick={() => speakWord(word.word_en)}
        className="bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-full w-20 h-20 flex items-center justify-center shadow-lg mx-auto mb-8 transition-all cursor-pointer"
      >
        <Volume2 className="w-10 h-10" />
      </button>

      <button
        onClick={() => (isLast ? onComplete() : setIdx((i) => i + 1))}
        className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-10 py-4 rounded-2xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <span>{isLast ? 'Concluir Passo 1' : 'Próxima Palavra'}</span>
        <ChevronRight className="w-6 h-6" />
      </button>
    </div>
  );
}

function Step2Offline({ words, onComplete }: { words: Word[]; onComplete: () => void }) {
  const drawWords = words.slice(0, 3);
  return (
    <div className="text-center py-4 max-w-3xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">✏️ Hora do Caderno</h3>
      <p className="text-slate-400 text-base mb-6">Pega no teu caderno e no lápis de cor!</p>

      <div className="bg-amber-50 rounded-3xl p-6 md:p-8 mb-6 text-left border border-amber-200">
        <p className="font-extrabold text-amber-800 text-lg mb-4 flex items-center gap-2">
          <Pencil className="w-6 h-6" /> Missão no caderno:
        </p>
        <div className="flex justify-around gap-4 my-4 bg-white/90 p-5 rounded-2xl shadow-xs">
          {drawWords.map((w) => (
            <div key={w.id} className="text-center">
              <div className="flex justify-center mb-2">
                <WordVisual word={w} size="md" />
              </div>
              <p className="font-black text-slate-800 text-base">{w.word_en}</p>
              <p className="text-xs text-slate-500 font-semibold">{w.word_pt}</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 py-4 rounded-2xl shadow-md active:scale-95 transition-all inline-flex items-center gap-2 cursor-pointer text-base"
      >
        <Check className="w-6 h-6" /> Já desenhei no caderno!
      </button>
    </div>
  );
}

function Step4RealChallenge({ words, onShowPin }: { words: Word[]; onShowPin: () => void }) {
  const challengeWords = words.slice(0, 3);
  return (
    <div className="text-center py-4 max-w-2xl mx-auto w-full">
      <h3 className="text-2xl font-extrabold text-slate-800 mb-1">🏆 Desafio Real</h3>
      <p className="text-slate-400 text-base mb-6">Fala estas palavras em inglês para os teus pais!</p>
      <div className="bg-rose-50 rounded-3xl p-6 mb-6 border border-rose-200">
        <div className="flex justify-around gap-4 bg-white/90 p-4 rounded-2xl max-w-md mx-auto shadow-xs">
          {challengeWords.map((w) => (
            <div key={w.id} className="text-center">
              <div className="flex justify-center mb-1">
                <WordVisual word={w} size="sm" />
              </div>
              <p className="font-black text-slate-800 text-base">{w.word_en}</p>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onShowPin}
        className="bg-rose-500 hover:bg-rose-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg cursor-pointer text-base"
      >
        <Lock className="w-6 h-6 inline mr-2" />
        Pedir confirmação dos pais (PIN)
      </button>
    </div>
  );
}

/* ==================== CAÇA-PALAVRAS INTERATIVO CORRIGIDO ==================== */
function WordSearchBoard({
  targetWord,
  onWordFound,
}: {
  targetWord: string;
  onWordFound: () => void;
}) {
  const cleanTarget = (targetWord || '').toUpperCase().replace(/[^A-Z]/g, '');
  const [selectedCoords, setSelectedCoords] = useState<{ r: number; c: number }[]>([]);
  const [gridData, setGridData] = useState<{
    grid: string[][];
    size: number;
  }>({ grid: [], size: 6 });

  useEffect(() => {
    if (!cleanTarget) return;

    const len = cleanTarget.length;
    const size = Math.max(6, len + 1);

    const g: string[][] = Array.from({ length: size }, () =>
      Array.from({ length: size }, () =>
        String.fromCharCode(65 + Math.floor(Math.random() * 26))
      )
    );

    const isHorizontal = Math.random() > 0.5;

    if (isHorizontal) {
      const r = Math.floor(Math.random() * size);
      const startC = Math.floor(Math.random() * (size - len + 1));
      for (let i = 0; i < len; i++) {
        g[r][startC + i] = cleanTarget[i];
      }
    } else {
      const c = Math.floor(Math.random() * size);
      const startR = Math.floor(Math.random() * (size - len + 1));
      for (let i = 0; i < len; i++) {
        g[startR + i][c] = cleanTarget[i];
      }
    }

    setGridData({ grid: g, size });
    setSelectedCoords([]);
  }, [cleanTarget]);

  const handleCellClick = (r: number, c: number) => {
    const alreadySelected = selectedCoords.some((pos) => pos.r === r && pos.c === c);
    let nextCoords: { r: number; c: number }[];

    if (alreadySelected) {
      nextCoords = selectedCoords.filter((pos) => !(pos.r === r && pos.c === c));
    } else {
      nextCoords = [...selectedCoords, { r, c }];
    }

    setSelectedCoords(nextCoords);

    const currentLetters = nextCoords
      .map((pos) => gridData.grid[pos.r]?.[pos.c] || '')
      .join('');

    if (currentLetters === cleanTarget) {
      onWordFound();
    }
  };

  const handleResetLetters = () => {
    setSelectedCoords([]);
  };

  const currentConstructedWord = selectedCoords
    .map((pos) => gridData.grid[pos.r]?.[pos.c] || '')
    .join('');

  return (
    <div className="flex flex-col items-center w-full">
      <div 
        className="grid gap-1.5 sm:gap-2 p-3 bg-indigo-50/70 border-2 border-indigo-200 rounded-3xl max-w-full mx-auto shadow-xs"
        style={{
          gridTemplateColumns: `repeat(${gridData.size}, minmax(0, 1fr))`,
        }}
      >
        {gridData.grid.map((row, r) =>
          row.map((char, c) => {
            const isSelected = selectedCoords.some((pos) => pos.r === r && pos.c === c);

            return (
              <button
                key={`${r}-${c}`}
                type="button"
                onClick={() => handleCellClick(r, c)}
                className={`w-8 h-8 sm:w-10 sm:h-10 md:w-11 md:h-11 rounded-xl font-black text-sm sm:text-base md:text-lg transition-all flex items-center justify-center cursor-pointer select-none active:scale-95 ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-md scale-105 border-2 border-indigo-700'
                    : 'bg-white text-slate-700 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50'
                }`}
              >
                {char}
              </button>
            );
          })
        )}
      </div>

      <div className="flex items-center gap-3 mt-4">
        <div className="px-4 py-2 bg-slate-100 rounded-xl border border-slate-200 text-slate-700 font-extrabold text-sm min-w-[140px] text-center">
          Letras: <span className="text-indigo-600 font-black">{currentConstructedWord || '...'}</span>
        </div>
        <button
          type="button"
          onClick={handleResetLetters}
          className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold text-xs cursor-pointer active:scale-95"
        >
          Limpar
        </button>
      </div>
    </div>
  );
}

/* ==================== PROVA AVALIATIVA (5 FASES • NOTA 0 A 10) ==================== */
type ExamPhase = 'listening' | 'context' | 'spelling' | 'word_search' | 'match';

interface ExamQuestion {
  id: number;
  phase: ExamPhase;
  target: Word;
  options?: string[];
  contextSentence?: string;
  scrambledLetters?: { id: number; char: string }[];
}

interface ExamAnswerRecord {
  question: ExamQuestion;
  userAnswerText: string;
  isCorrect: boolean;
  correctAnswerText: string;
}

function WeeklyExamRunner({
  words,
  moduleTitle,
  onBack,
  onFinishExam,
}: {
  words: Word[];
  moduleTitle: string;
  onBack: () => void;
  onFinishExam: (score: number, earnedStars: number) => void;
}) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [answered, setAnswered] = useState(false);
  const [selectedOpt, setSelectedOpt] = useState<string | null>(null);
  const [selectedLetterIndices, setSelectedLetterIndices] = useState<number[]>([]);
  const [examRecords, setExamRecords] = useState<ExamAnswerRecord[]>([]);
  const [examFinished, setExamFinished] = useState(false);

  useEffect(() => {
    (async () => {
      if (!words || words.length === 0) return;

      let wordPool = [...words];

      if (wordPool.length < 25) {
        const { data: pastWords } = await supabase
          .from('words')
          .select('*')
          .order('id', { ascending: false })
          .limit(50);

        if (pastWords && pastWords.length > 0) {
          const uniquePast = (pastWords as Word[]).filter(
            (pw) => !wordPool.some((w) => w.word_en.toLowerCase() === pw.word_en.toLowerCase())
          );
          const needed = 25 - wordPool.length;
          wordPool = [...wordPool, ...uniquePast.slice(0, needed)];
        }
      }

      const shuffled = [...wordPool].sort(() => Math.random() - 0.5);
      const examWords = shuffled.slice(0, Math.min(25, shuffled.length));

      const generated: ExamQuestion[] = [];
      let qId = 1;

      examWords.forEach((target, index) => {
        const phaseIndex = index % 5;
        const otherWords = examWords.filter((w) => w.id !== target.id);

        if (phaseIndex === 0) {
          const wrong = otherWords
            .sort(() => Math.random() - 0.5)
            .slice(0, 2)
            .map((w) => w.word_en);
          generated.push({
            id: qId++,
            phase: 'listening',
            target,
            options: [target.word_en, ...wrong].sort(() => Math.random() - 0.5),
          });
        } else if (phaseIndex === 1) {
          const wrong = otherWords
            .sort(() => Math.random() - 0.5)
            .slice(0, 2)
            .map((w) => w.word_en);
          generated.push({
            id: qId++,
            phase: 'context',
            target,
            contextSentence: getContextSentence(target),
            options: [target.word_en, ...wrong].sort(() => Math.random() - 0.5),
          });
        } else if (phaseIndex === 2) {
          const cleanLetters = target.word_en.toUpperCase().replace(/[^A-Z]/g, '').split('');
          const scrambled = cleanLetters
            .map((char, i) => ({ id: i, char }))
            .sort(() => Math.random() - 0.5);
          generated.push({
            id: qId++,
            phase: 'spelling',
            target,
            scrambledLetters: scrambled,
          });
        } else if (phaseIndex === 3) {
          generated.push({
            id: qId++,
            phase: 'word_search',
            target,
          });
        } else {
          const wrong = otherWords
            .sort(() => Math.random() - 0.5)
            .slice(0, 2)
            .map((w) => w.word_pt);
          generated.push({
            id: qId++,
            phase: 'match',
            target,
            options: [target.word_pt, ...wrong].sort(() => Math.random() - 0.5),
          });
        }
      });

      setQuestions(generated);
    })();
  }, [words]);

  const q = questions[currentIdx];
  const totalQuestions = questions.length;

  useEffect(() => {
    if (q) {
      setTimeout(() => speakWord(q.target.word_en), 250);
    }
    setSelectedLetterIndices([]);
    setAnswered(false);
    setSelectedOpt(null);
  }, [currentIdx, q]);

  if (!q) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400 font-bold">Preparando os desafios da avaliação...</p>
      </div>
    );
  }

  const advanceWithRecord = (isCorrect: boolean, userAnswerText: string, correctAnswerText: string) => {
    setAnswered(true);
    if (isCorrect) {
      setScore((s) => s + 1);
      playSuccessSound();
    } else {
      playErrorSound();
    }

    setExamRecords((prev) => [
      ...prev,
      {
        question: q,
        isCorrect,
        userAnswerText,
        correctAnswerText,
      },
    ]);

    setTimeout(() => {
      if (currentIdx < totalQuestions - 1) {
        setCurrentIdx((i) => i + 1);
      } else {
        setExamFinished(true);
      }
    }, 1100);
  };

  const handleSelectOption = (chosenText: string, correctText: string) => {
    if (answered) return;
    setSelectedOpt(chosenText);
    const isCorrect = chosenText.trim().toLowerCase() === correctText.trim().toLowerCase();
    advanceWithRecord(isCorrect, chosenText, correctText);
  };

  const handlePickLetter = (scrambleIdx: number) => {
    if (answered || selectedLetterIndices.includes(scrambleIdx)) return;
    setSelectedLetterIndices((prev) => [...prev, scrambleIdx]);
  };

  const handleRemoveLastLetter = () => {
    if (answered || selectedLetterIndices.length === 0) return;
    setSelectedLetterIndices((prev) => prev.slice(0, -1));
  };

  const handleConfirmSpelling = () => {
    if (answered) return;
    const targetClean = (q.target.word_en || '').toUpperCase().replace(/[^A-Z]/g, '');
    const currentSpelled = selectedLetterIndices
      .map((idx) => q.scrambledLetters?.[idx]?.char || '')
      .join('');

    const isCorrect = currentSpelled === targetClean;
    advanceWithRecord(isCorrect, currentSpelled || '(Em branco)', targetClean);
  };

  if (examFinished) {
    const finalScore10 = totalQuestions > 0 ? Number(((score / totalQuestions) * 10).toFixed(1)) : 10.0;
    const earnedStars = score * 2;
    const passed = finalScore10 >= 6.0;

    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="bg-white rounded-3xl shadow-xl p-8 border-2 border-slate-100 text-center mb-6">
          <div className="text-7xl mb-3">{passed ? '🏆' : '📖'}</div>
          <h2 className="text-2xl font-black text-slate-800 mb-1">
            {passed ? 'Excelente Desempenho!' : 'Avaliação Concluída!'}
          </h2>
          <p className="text-slate-500 font-semibold mb-6">Módulo: {moduleTitle}</p>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-2xl">
              <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Sua Nota</span>
              <p className="text-4xl font-black text-indigo-900 mt-1">
                {finalScore10} <span className="text-xl text-indigo-400 font-bold">/ 10.0</span>
              </p>
            </div>
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Estrelas Ganhas</span>
              <p className="text-4xl font-black text-amber-600 mt-1">+{earnedStars} ⭐</p>
            </div>
          </div>

          <p className="text-sm font-bold text-slate-600 mb-6">
            Você acertou <strong className="text-emerald-600">{score}</strong> de <strong>{totalQuestions}</strong> questões.
          </p>

          <button
            onClick={() => onFinishExam(score, earnedStars)}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg cursor-pointer text-base transition-all hover:scale-105 active:scale-95"
          >
            Gravar Resultado & Concluir Módulo
          </button>
        </div>

        <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
          <h3 className="font-extrabold text-slate-800 text-lg mb-1 flex items-center gap-2">
            📋 Gabarito da Avaliação
          </h3>
          <p className="text-xs text-slate-400 mb-4">Veja como foi sua resposta em cada item:</p>

          <div className="space-y-3">
            {examRecords.map((item, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl border-2 flex items-center justify-between gap-3 ${
                  item.isCorrect ? 'bg-emerald-50/50 border-emerald-200' : 'bg-rose-50/50 border-rose-200'
                }`}
              >
                <div className="min-w-0">
                  <p className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                    <span>{item.question.target.word_en}</span>
                    <button
                      onClick={() => speakWord(item.question.target.word_en)}
                      className="text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      title="Ouvir som"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs text-slate-400 font-normal">({item.question.target.word_pt})</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Sua resposta: <strong className={item.isCorrect ? 'text-emerald-700' : 'text-rose-600 line-through'}>{item.userAnswerText}</strong>
                  </p>
                  {!item.isCorrect && (
                    <p className="text-xs text-emerald-700 font-bold mt-0.5">
                      Resposta certa: {item.correctAnswerText}
                    </p>
                  )}
                </div>

                <div className="shrink-0">
                  {item.isCorrect ? (
                    <span className="text-xs font-black bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                      Correto ✔
                    </span>
                  ) : (
                    <span className="text-xs font-black bg-rose-100 text-rose-800 px-3 py-1 rounded-full">
                      Errou ✘
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const targetCleanLength = (q.target.word_en || '').toUpperCase().replace(/[^A-Z]/g, '').length;
  const isSpellingComplete = selectedLetterIndices.length === targetCleanLength;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 font-bold text-sm cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
          Sair
        </button>
        <div className="flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-800 font-black text-xs px-3 py-1 rounded-full uppercase">
            {q.phase === 'listening' && '🎧 1. Ouvir & Identificar'}
            {q.phase === 'context' && '📝 2. Frase do Cotidiano'}
            {q.phase === 'spelling' && '🔤 3. Monte as Letras'}
            {q.phase === 'word_search' && '🔍 4. Caça-Palavras'}
            {q.phase === 'match' && '🔄 5. O que Significa?'}
          </span>
          <span className="text-xs text-slate-400 font-bold">
            {currentIdx + 1} de {totalQuestions}
          </span>
        </div>
        <div className="font-extrabold text-sm text-slate-600">
          Acertos: <strong className="text-emerald-600">{score}</strong>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-md border-2 border-slate-100 p-8 text-center min-h-[420px] flex flex-col justify-between">
        {/* FASE 1: LISTENING */}
        {q.phase === 'listening' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Ouve com atenção:</p>
              <button
                onClick={() => speakWord(q.target.word_en)}
                className="w-24 h-24 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full flex items-center justify-center shadow-xl mx-auto my-6 active:scale-95 transition-all cursor-pointer"
              >
                <Volume2 className="w-12 h-12" />
              </button>
              <p className="text-slate-600 text-base font-bold">Qual palavra em inglês você ouviu?</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {q.options?.map((opt) => {
                const isCorrect = opt === q.target.word_en;
                const isSelected = selectedOpt === opt;
                let btnStyle = 'border-slate-200 bg-white text-slate-800 hover:border-indigo-400';

                if (answered) {
                  if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-black shadow-sm';
                  else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 line-through';
                  else btnStyle = 'border-slate-100 bg-slate-50 text-slate-300 opacity-40';
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(opt, q.target.word_en)}
                    disabled={answered}
                    className={`py-5 px-4 rounded-2xl border-2 font-black text-lg transition-all cursor-pointer flex items-center justify-center shadow-xs ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* FASE 2: COMPLETE A FRASE */}
        {q.phase === 'context' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Complete a frase com a palavra certa:</p>
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-6 my-6">
                <p className="text-xl sm:text-2xl font-black text-slate-800 leading-relaxed">
                  "{q.contextSentence}"
                </p>
                <p className="text-xs text-slate-500 font-bold mt-3">
                  (Palavra em português: <strong className="text-indigo-700">{q.target.word_pt}</strong>)
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {q.options?.map((opt) => {
                const isCorrect = opt === q.target.word_en;
                const isSelected = selectedOpt === opt;
                let btnStyle = 'border-slate-200 bg-white text-slate-800 hover:border-indigo-400';

                if (answered) {
                  if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-black shadow-sm';
                  else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 line-through';
                  else btnStyle = 'border-slate-100 bg-slate-50 text-slate-300 opacity-40';
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(opt, q.target.word_en)}
                    disabled={answered}
                    className={`py-5 px-4 rounded-2xl border-2 font-black text-lg transition-all cursor-pointer flex items-center justify-center shadow-xs ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {/* FASE 3: MONTE A PALAVRA */}
        {q.phase === 'spelling' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Toque nas letras e monte o nome em inglês:</p>
              
              <div className="my-4">
                <button
                  onClick={() => speakWord(q.target.word_en)}
                  className="w-18 h-18 bg-amber-500 hover:bg-amber-600 text-white rounded-full flex items-center justify-center shadow-lg mx-auto active:scale-95 transition-all cursor-pointer"
                >
                  <Volume2 className="w-9 h-9" />
                </button>
                <h3 className="text-2xl font-black text-slate-800 mt-2">"{q.target.word_pt}"</h3>
              </div>

              <div className="flex justify-center gap-2 my-5 min-h-[48px] flex-wrap">
                {Array.from({ length: targetCleanLength }).map((_, i) => {
                  const letterIdx = selectedLetterIndices[i];
                  const char = letterIdx !== undefined && q.scrambledLetters && q.scrambledLetters[letterIdx]
                    ? q.scrambledLetters[letterIdx]?.char
                    : '';

                  return (
                    <div
                      key={i}
                      onClick={i === selectedLetterIndices.length - 1 ? handleRemoveLastLetter : undefined}
                      className={`w-11 h-13 rounded-xl border-2 flex items-center justify-center font-black text-2xl transition-all ${
                        char
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-700 cursor-pointer shadow-xs active:scale-95'
                          : 'border-dashed border-slate-300 bg-slate-50 text-transparent'
                      }`}
                      title={char ? 'Tocar para apagar' : ''}
                    >
                      {char || ''}
                    </div>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap justify-center gap-2.5 my-2">
                {q.scrambledLetters?.map((item, i) => {
                  const isUsed = selectedLetterIndices.includes(i);
                  return (
                    <button
                      key={item?.id ?? i}
                      onClick={() => handlePickLetter(i)}
                      disabled={isUsed || answered}
                      className={`w-12 h-12 rounded-2xl border-2 font-black text-xl transition-all ${
                        isUsed
                          ? 'border-slate-100 bg-slate-100 text-slate-300 opacity-40 cursor-not-allowed'
                          : 'border-amber-300 bg-white hover:border-amber-500 text-slate-800 shadow-sm active:scale-95 cursor-pointer'
                      }`}
                    >
                      {item?.char || ''}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-center gap-3 mt-4">
                <button
                  type="button"
                  onClick={handleRemoveLastLetter}
                  disabled={selectedLetterIndices.length === 0 || answered}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  ⌫ Apagar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmSpelling}
                  disabled={!isSpellingComplete || answered}
                  className={`px-6 py-2.5 rounded-xl font-black text-xs transition-all shadow-sm ${
                    isSpellingComplete && !answered
                      ? 'bg-amber-600 hover:bg-amber-700 text-white cursor-pointer hover:scale-105 active:scale-95'
                      : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Confirmar Letras ✔
                </button>
              </div>
            </div>
          </>
        )}

        {/* FASE 4: CAÇA-PALAVRAS */}
        {q.phase === 'word_search' && (
          <div>
            <div className="mb-4">
              <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full inline-flex items-center gap-1.5 uppercase tracking-wider mb-2">
                <Search className="w-3.5 h-3.5" /> Encontre a palavra na grade
              </span>
              <div className="flex items-center justify-center gap-2 mt-1">
                <h3 className="text-xl font-black text-slate-800">
                  Procure: <span className="text-indigo-600">"{q.target.word_pt}"</span>
                </h3>
                <button
                  onClick={() => speakWord(q.target.word_en)}
                  className="w-8 h-8 rounded-full bg-indigo-100 hover:bg-indigo-200 text-indigo-700 flex items-center justify-center cursor-pointer transition-all"
                  title="Ouvir som"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <WordSearchBoard
              targetWord={q.target.word_en}
              onWordFound={() => {
                if (answered) return;
                advanceWithRecord(true, q.target.word_en, q.target.word_en);
              }}
            />
          </div>
        )}

        {/* FASE 5: O QUE SIGNIFICA? */}
        {q.phase === 'match' && (
          <>
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Significado em Português:</p>
              <div className="my-6">
                <button
                  onClick={() => speakWord(q.target.word_en)}
                  className="inline-flex items-center gap-1.5 text-indigo-600 bg-indigo-50 border border-indigo-200 text-xs font-bold px-4 py-1.5 rounded-full cursor-pointer hover:bg-indigo-100 mb-3"
                >
                  <Volume2 className="w-4 h-4" /> Ouvir pronúncia
                </button>
                <h3 className="text-4xl font-black text-slate-800">"{q.target.word_en}"</h3>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 mt-4">
              {q.options?.map((opt) => {
                const isCorrect = opt === q.target.word_pt;
                const isSelected = selectedOpt === opt;
                let btnStyle = 'border-slate-200 bg-white text-slate-800 hover:border-indigo-400';

                if (answered) {
                  if (isCorrect) btnStyle = 'border-emerald-500 bg-emerald-50 text-emerald-800 font-black shadow-sm';
                  else if (isSelected) btnStyle = 'border-rose-500 bg-rose-50 text-rose-800 line-through';
                  else btnStyle = 'border-slate-100 bg-slate-50 text-slate-300 opacity-40';
                }

                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(opt, q.target.word_pt)}
                    disabled={answered}
                    className={`py-5 px-4 rounded-2xl border-2 font-black text-lg transition-all cursor-pointer flex items-center justify-center shadow-xs ${btnStyle}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}