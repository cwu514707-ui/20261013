// p5.js 響應式 Google Sheets 雲端題庫測驗系統（已整合你的試算表）

let allQuestions = []; // 儲存從雲端或本地讀取到的完整題庫
let questions = [];    // 儲存每次隨機抽出的 5 道題目
let currentQuestion = 0; // 目前題數索引
let score = 0;         // 答對題數
let selectedOption = null; // 玩家所選選項
let isAnswered = false; // 是否已作答
let isLoading = true;   // 是否仍在載入中

// 響應式排版尺寸變數
let boxWidth, boxHeight, startY, spacing, titleSize, questionSize, optionSize;

// 預先載入題庫
function preload() {
  // 將你提供的網址轉換為 CSV 格式的下載連結
  let sheetURL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQHUhIGuctsiQrdwQbFGaC-FbZlJ35fqniUyMbTKJX9W7wpn7oUDhU6ACc_-49kvTU_Ah44-tZRTHd8/pub?output=csv'; 

  // 嘗試載入 Google 試算表
  loadTable(
    sheetURL, 
    'csv', 
    'header', 
    function(table) {
      // 成功載入回調
      allQuestions = table;
      isLoading = false;
      console.log("成功載入 Google 試算表題庫！");
      initQuiz();
    }, 
    function(err) {
      // 失敗或逾時回調：自動改用本地 questions.csv 備用題庫
      console.log("無法讀取雲端試算表（可能是網路或CORS限制），自動切換至本地 questions.csv 備用題庫", err);
      loadTable('questions.csv', 'csv', 'header', function(table) {
        allQuestions = table;
        isLoading = false;
        initQuiz();
      }, function(localErr) {
        console.error("連本地備用題庫也讀取失敗！", localErr);
        isLoading = false;
      });
    }
  );
}

function setup() {
  // 建立全螢幕畫布
  createCanvas(windowWidth, windowHeight);
  
  // 設定全域使用 Noto Sans TC 字體
  textFont('Noto Sans TC');
  textAlign(CENTER, CENTER);
  
  // 初始化響應式尺寸
  updateLayoutMetrics();
}

// 初始化並隨機抽取 5 題
function initQuiz() {
  if (!allQuestions || allQuestions.getRowCount() === 0) return;

  currentQuestion = 0;
  score = 0;
  selectedOption = null;
  isAnswered = false;

  let tempQuestions = [];
  for (let i = 0; i < allQuestions.getRowCount(); i++) {
    let qText = allQuestions.getString(i, 'question');
    let opts = [
      allQuestions.getString(i, 'opt0'),
      allQuestions.getString(i, 'opt1'),
      allQuestions.getString(i, 'opt2'),
      allQuestions.getString(i, 'opt3')
    ];
    let ans = allQuestions.getNum(i, 'answer');

    tempQuestions.push({
      question: qText,
      options: opts,
      answer: ans
    });
  }

  // 隨機打亂題庫順序
  tempQuestions = shuffle(tempQuestions);

  // 取出前 5 題作為本次測驗題目
  let takeCount = min(5, tempQuestions.length);
  questions = tempQuestions.slice(0, takeCount);
}

function draw() {
  // 深色背景
  background(30, 30, 40);

  // 如果還在載入中，顯示提示文字避免畫面全黑或卡住
  if (isLoading) {
    fill(255);
    textSize(24);
    text("正在載入雲端題庫中，請稍候...", width / 2, height / 2);
    return;
  }

  // 判斷是否完成所有題目
  if (currentQuestion >= questions.length) {
    showResultScreen();
    return;
  }

  // 繪製頂部進度提示
  fill(200);
  textSize(titleSize);
  text(`題目 ${currentQuestion + 1} / ${questions.length}`, width / 2, height * 0.12);

  let q = questions[currentQuestion];

  // 繪製題目文字
  fill(255);
  textSize(questionSize);
  let textMargin = width * 0.1;
  text(q.question, textMargin, height * 0.22, width - textMargin * 2, height * 0.2);

  // 繪製四個選項按鈕
  for (let i = 0; i < q.options.length; i++) {
    let boxY = startY + i * (boxHeight + spacing);
    let boxX = width / 2 - boxWidth / 2;

    let btnColor = color(50, 60, 80);
    let textColor = color(255);

    // 作答後的色彩回饋 (答錯時在正確選項上加上綠色)
    if (isAnswered) {
      if (i === q.answer) {
        btnColor = color(46, 204, 113); // 正確選項顯示綠色
      } else if (i === selectedOption) {
        btnColor = color(231, 76, 60);  // 點錯的選項顯示紅色
      }
    } else {
      // 滑鼠懸停效果
      if (
        mouseX > boxX &&
        mouseX < boxX + boxWidth &&
        mouseY > boxY &&
        mouseY < boxY + boxHeight
      ) {
        btnColor = color(70, 90, 120);
      }
    }

    // 繪製按鈕外框與背景
    fill(btnColor);
    stroke(100, 120, 150);
    strokeWeight(2);
    rect(boxX, boxY, boxWidth, boxHeight, 10);

    // 繪製選項文字
    noStroke();
    fill(textColor);
    textSize(optionSize);
    text(q.options[i], width / 2, boxY + boxHeight / 2);
  }

  // 作答後的提示訊息
  if (isAnswered) {
    fill(241, 196, 15);
    textSize(titleSize);
    text("請點擊畫面任意處以進入下一題", width / 2, height * 0.88);
  }
}

// 處理滑鼠點擊 / 手機觸控事件
function mousePressed() {
  if (isLoading) return;

  if (currentQuestion >= questions.length) {
    initQuiz(); // 重新抽題並開始新測驗
    return;
  }

  if (!isAnswered) {
    let q = questions[currentQuestion];
    for (let i = 0; i < q.options.length; i++) {
      let boxY = startY + i * (boxHeight + spacing);
      let boxX = width / 2 - boxWidth / 2;

      if (
        mouseX > boxX &&
        mouseX < boxX + boxWidth &&
        mouseY > boxY &&
        mouseY < boxY + boxHeight
      ) {
        selectedOption = i;
        isAnswered = true;
        if (selectedOption === q.answer) {
          score++;
        }
        break;
      }
    }
  } else {
    currentQuestion++;
    isAnswered = false;
    selectedOption = null;
  }
}

// 結算畫面
function showResultScreen() {
  fill(255);
  textSize(questionSize * 1.2);
  text("測驗結束！", width / 2, height / 2 - height * 0.15);

  textSize(questionSize);
  fill(46, 204, 113);
  text(`你總共答對了 ${score} 題 (共 ${questions.length} 題)`, width / 2, height / 2);

  fill(200);
  textSize(titleSize);
  text("點擊畫面任意處重新開始測驗", width / 2, height / 2 + height * 0.15);
}

// 動態計算響應式尺寸
function updateLayoutMetrics() {
  boxWidth = constrain(width * 0.85, 280, 650);
  boxHeight = constrain(height * 0.08, 45, 65);
  spacing = constrain(height * 0.025, 12, 20);
  startY = height * 0.38;

  titleSize = constrain(width * 0.035, 14, 20);
  questionSize = constrain(width * 0.045, 18, 26);
  optionSize = constrain(width * 0.038, 15, 22);
}

// 當瀏覽器視窗大小改變時調整
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  updateLayoutMetrics();
}