import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações da Gravação
const BASE_URL = process.env.DEMO_URL || process.argv.find(a => a.startsWith('--url='))?.split('=')[1] || 'https://crewcode.com.br/';
const USERNAME = process.env.DEMO_USER || 'ArturK';
const PASSWORD = process.env.DEMO_PASS || '2007@Rture';
const OUTPUT_DIR = path.resolve(__dirname, '../videos');

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function humanType(page, selector, text, delayMs = 45) {
  const el = page.locator(selector).first();
  await el.waitFor({ state: 'visible', timeout: 35000 });
  await el.focus();
  await page.keyboard.type(text, { delay: delayMs });
  await sleep(600);
}

async function typeIntoTerminal(page, command, delayMs = 65) {
  // 1. Garante que a aba TERMINAL no painel inferior está selecionada
  const terminalTab = page.locator('span:has-text("TERMINAL")').first();
  if (await terminalTab.isVisible({ timeout: 2000 })) {
    await terminalTab.click();
    await sleep(300);
  }

  // 2. Desfoca ativamente qualquer editor (Monaco) ou preview prévio para evitar envio para o código
  await page.evaluate(() => {
    if (document.activeElement && document.activeElement.blur) {
      document.activeElement.blur();
    }
  });
  await sleep(300);

  // 3. Localiza e clica especificamente na tela visível do terminal ATIVO (evita selecionar Monaco ou terminais ocultos)
  const visibleTerminalScreen = page.locator('div.block .xterm-screen, div:not(.hidden) > div > .xterm .xterm-screen, .xterm:not(.hidden) .xterm-screen').last();
  if (await visibleTerminalScreen.isVisible({ timeout: 6000 })) {
    await visibleTerminalScreen.click({ force: true });
    await sleep(300);
  }

  // 4. Garante foco no helper textarea interno do xterm ATIVO via JS
  await page.evaluate(() => {
    const xterms = Array.from(document.querySelectorAll('.xterm'));
    // Encontra o terminal visível (sem classe hidden em ancestrais e com offsetParent)
    const activeXterm = xterms.reverse().find(x => !x.closest('.hidden') && x.offsetParent !== null) || xterms[0];
    if (activeXterm) {
      const ta = activeXterm.querySelector('.xterm-helper-textarea');
      if (ta) {
        ta.focus();
      }
    }
  });
  await sleep(400);

  // 5. Verificação de segurança: certifica que o elemento focado é realmente o helper textarea do terminal
  const isTerminalFocused = await page.evaluate(() => {
    const active = document.activeElement;
    return active && active.classList.contains('xterm-helper-textarea');
  });
  if (!isTerminalFocused) {
    console.log('⚠️ Re-focando no helper textarea do terminal ativo para segurança...');
    await page.evaluate(() => {
      const activeTa = Array.from(document.querySelectorAll('.xterm-helper-textarea')).reverse().find(t => !t.closest('.hidden') && t.offsetParent !== null);
      if (activeTa) activeTa.focus();
    });
    await sleep(300);
  }

  // 6. Digita o comando com cadência natural e estável (Playwright gerencia o atraso entre teclas)
  await page.keyboard.type(command, { delay: delayMs });
  await sleep(500);
  await page.keyboard.press('Enter');
  await sleep(800);
}

async function smoothScroll(page, yTarget, durationMs = 1500) {
  await page.evaluate(async ({ yTarget, durationMs }) => {
    const startY = window.scrollY;
    const diff = yTarget - startY;
    const startTime = performance.now();

    await new Promise((resolve) => {
      function step(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const ease = progress < 0.5 ? 2 * progress * progress : -1 + (4 - 2 * progress) * progress;
        window.scrollTo(0, startY + diff * ease);

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      }
      requestAnimationFrame(step);
    });
  }, { yTarget, durationMs });
  await sleep(800);
}

async function recordDemo() {
  console.log(`\n======================================================`);
  console.log(`🎬 [CodeSync] Iniciando Gravação Automatizada Completa (Showcase Master)`);
  console.log(`🌐 Alvo: ${BASE_URL}`);
  console.log(`👤 Usuário: ${USERNAME}`);
  console.log(`📁 Diretório de Saída: ${OUTPUT_DIR}`);
  console.log(`======================================================\n`);

  const WIDTH = 1920;
  const HEIGHT = 1080;

  const browser = await chromium.launch({
    headless: false,
    slowMo: 40,
    args: [
      `--window-size=${WIDTH},${HEIGHT}`,
      '--force-device-scale-factor=1',
      '--no-sandbox',
      '--disable-setuid-sandbox'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: WIDTH, height: HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: OUTPUT_DIR,
      size: { width: WIDTH, height: HEIGHT }
    },
    colorScheme: 'dark'
  });

  const page = await context.newPage();

  try {
    // ----------------------------------------------------
    // CENA 1: LANDING PAGE — APRESENTAÇÃO & HERO
    // ----------------------------------------------------
    console.log('📌 Cena 1: Landing Page & Apresentação Visual...');
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await sleep(3000);

    await smoothScroll(page, 600, 1400);
    await sleep(2500);
    await smoothScroll(page, 0, 1000);
    await sleep(2000);

    // ----------------------------------------------------
    // CENA 2: LOGIN COM ARTURK
    // ----------------------------------------------------
    console.log(`📌 Cena 2: Autenticação com usuário '${USERNAME}'...`);
    const authBtn = page.locator('header button:has-text("Entrar"), button:has-text("Área de Usuário"), button:has-text("Login")').first();
    if (await authBtn.isVisible({ timeout: 5000 })) {
      await authBtn.click();
      await sleep(2000);
    }

    const userInput = page.locator('input[placeholder*="Usuário"], input[placeholder*="Usuario"], input[placeholder*="Username"], input[type="text"]').first();
    await userInput.waitFor({ state: 'visible', timeout: 15000 });

    await humanType(page, 'input[placeholder*="Usuário"], input[placeholder*="Usuario"], input[placeholder*="Username"], input[type="text"]', USERNAME, 45);
    await sleep(1000);

    await humanType(page, 'input[placeholder*="Senha"], input[placeholder*="Password"], input[type="password"]', PASSWORD, 45);
    await sleep(1500);

    const formSubmit = page.locator('form button[type="submit"], button:has-text("Entrar")').last();
    if (await formSubmit.isVisible({ timeout: 3000 })) {
      await formSubmit.click();
    } else {
      await page.keyboard.press('Enter');
    }

    await sleep(4000);

    // ----------------------------------------------------
    // CENA 3: DASHBOARD & CRIAÇÃO DA SALA
    // ----------------------------------------------------
    console.log('📌 Cena 3: Dashboard — Criando nova sessão...');
    const projectInput = page.locator('input[placeholder="Nome do projeto..."], input[placeholder*="projeto"]').first();
    await projectInput.waitFor({ state: 'visible', timeout: 20000 });
    await sleep(2500);

    const roomName = `CodeSync Showcase ${Math.floor(Math.random() * 900 + 100)}`;
    await humanType(page, 'input[placeholder="Nome do projeto..."], input[placeholder*="projeto"]', roomName, 40);
    await sleep(1500);

    const createSessionBtn = page.locator('button:has-text("+ Criar Sessão"), button:has-text("Criar Projeto"), button:has-text("Criar Sessão")').first();
    await createSessionBtn.click();
    await sleep(3000);

    console.log('📌 Cena 3.1: Clicando em "Entrar Agora"...');
    const enterNowBtn = page.locator('button:has-text("Entrar Agora")').first();
    await enterNowBtn.waitFor({ state: 'visible', timeout: 15000 });
    await sleep(1500);
    await enterNowBtn.click();

    await page.waitForURL(/sessionId=/, { timeout: 25000 });
    console.log('📌 IDE Carregada com Sucesso!');
    await sleep(4500);

    // ----------------------------------------------------
    // CENA 4: CRIAÇÃO DO ARQUIVO test.js
    // ----------------------------------------------------
    console.log('📌 Cena 4: Criando arquivo test.js no Explorer...');
    const newFileBtn = page.locator('button[title*="New File"], button[title*="Novo Arquivo"], .codicon-new-file, button:has(.codicon-new-file)').first();
    if (await newFileBtn.isVisible({ timeout: 5000 })) {
      await newFileBtn.click();
      await sleep(1500);

      const fileNameInput = page.locator('input[placeholder*="meu-arquivo"], input[placeholder*="my-file"], input[placeholder*="arquivo"], input[placeholder*="file"], input[type="text"]').first();
      await fileNameInput.waitFor({ state: 'visible', timeout: 6000 });
      await humanType(page, 'input[placeholder*="meu-arquivo"], input[placeholder*="my-file"], input[placeholder*="arquivo"], input[placeholder*="file"], input[type="text"]', 'test.js', 45);
      await sleep(1000);

      const createModalBtn = page.locator('div.fixed button:has-text("Criar"), div.fixed button:has-text("Create"), button:has-text("Criar"), button:has-text("Create")').last();
      await createModalBtn.click();
      await sleep(3000);
    }

    // ----------------------------------------------------
    // CENA 5: MONACO EDITOR — CÓDIGO SIMPLES
    // ----------------------------------------------------
    console.log('📌 Cena 5: Digitando código simples em test.js...');
    const monacoEditor = page.locator('.monaco-editor').first();
    if (await monacoEditor.isVisible({ timeout: 5000 })) {
      await monacoEditor.click();
      await sleep(800);
      await page.keyboard.press('Control+A');
      await page.keyboard.press('Backspace');
      await sleep(600);

      const codeSnippet = [
        '// 🚀 CodeSync Cloud IDE — Teste de Execução Rápida',
        'console.log("=========================================");',
        'console.log("⚡ Executando código ao vivo no CodeSync!");',
        'const somar = (a, b) => a + b;',
        'console.log("Resultado de 50 + 50 =", somar(50, 50));',
        'console.log("🟢 Ambiente Node.js pronto para Fullstack!");',
        'console.log("=========================================");'
      ].join('\n');

      await page.keyboard.insertText(codeSnippet);
      await sleep(3500);
      await page.keyboard.press('Control+S');
      await sleep(2000);
    }

    // ----------------------------------------------------
    // CENA 6: EXECUTAR NO TERMINAL PTY
    // ----------------------------------------------------
    console.log('📌 Cena 6: Focando no Terminal e Executando test.js...');
    const term1Tab = page.locator('div:has-text("Terminal 1")').first();
    if (await term1Tab.isVisible({ timeout: 2000 })) {
      await term1Tab.click();
      await sleep(500);
    }
    await typeIntoTerminal(page, 'node test.js', 70);
    await sleep(4000);

    // ----------------------------------------------------
    // CENA 7: AGENTE DE IA (BARRA LATERAL) & APROVAR TODOS
    // ----------------------------------------------------
    console.log('📌 Cena 7: Abrindo CodeSync AI Agent pelo botão lateral (Robô)...');
    const aiSidebarBtn = page.locator('button[title*="AI Assistant"], button[title*="Assistente"], button:has(.codicon-robot)').first();
    if (await aiSidebarBtn.isVisible({ timeout: 5000 })) {
      await aiSidebarBtn.click();
      await sleep(2500);

      const aiInput = page.locator('textarea[placeholder*="Pergunte"], textarea[placeholder*="Ask"], textarea').first();
      if (await aiInput.isVisible({ timeout: 4000 })) {
        const aiPrompt = 'Crie uma aplicação web com Node.js/Express, index.html moderno, styles.css estilizado e script.js interativo na porta 3000.';
        await humanType(page, 'textarea, input[placeholder*="Pergunte"], input[placeholder*="Ask"]', aiPrompt, 30);
        await sleep(1500);

        const sendAiBtn = page.locator('button[title*="Enviar"], button[title*="Send"], button:has(.codicon-send)').first();
        if (await sendAiBtn.isVisible({ timeout: 2000 })) {
          await sendAiBtn.click();
        } else {
          await page.keyboard.press('Enter');
        }

        console.log('📌 Aguardando o Agente de IA responder e gerar a proposta de arquivos...');
        
        const approveAllBtn = page.locator('button:has-text("Aprovar Todos"), button:has-text("Approve All"), button:has-text("Aprovar todos")').first();
        try {
          await approveAllBtn.waitFor({ state: 'visible', timeout: 120000 });
          await sleep(3000);
          await approveAllBtn.scrollIntoViewIfNeeded();
          console.log('📌 Clicando em "Aprovar Todos" para aplicar os arquivos no projeto...');
          await approveAllBtn.click({ force: true });
          await sleep(4000);
        } catch (e) {
          console.log('⚠️ Botão Aprovar Todos demorou ou não apareceu, prosseguindo...');
        }
      }

      console.log('📌 Fechando modal da IA após aprovação...');
      await page.keyboard.press('Escape');
      await sleep(2500);
    }

    // ----------------------------------------------------
    // CENA 8: EXECUTAR NPM INSTALL & NPM START NO TERMINAL
    // ----------------------------------------------------
    console.log('📌 Cena 8: Executando npm install && npm start no Terminal PTY...');
    const term1TabAgain = page.locator('div:has-text("Terminal 1")').first();
    if (await term1TabAgain.isVisible({ timeout: 2000 })) {
      await term1TabAgain.click();
      await sleep(500);
    }
    await typeIntoTerminal(page, 'npm install && npm start', 60);
    console.log('📌 Aguardando npm install e inicialização do Express na porta 3000...');
    await sleep(16000);

    // ----------------------------------------------------
    // CENA 9: ABRIR BROWSER INTERNO (BARRA LATERAL)
    // ----------------------------------------------------
    console.log('📌 Cena 9: Abrindo Browser Interno (botão abaixo do robô)...');
    const browserSidebarBtn = page.locator('button[title*="Simple Browser"]').first();
    if (await browserSidebarBtn.isVisible({ timeout: 5000 })) {
      await browserSidebarBtn.click();
      console.log('📌 Browser Interno aberto na porta :3000!');
      await sleep(5000);

      const refreshBrowserBtn = page.locator('button[title*="Recarregar"], button[title*="Refresh"], .codicon-refresh, button:has(.codicon-refresh)').first();
      if (await refreshBrowserBtn.isVisible({ timeout: 3000 })) {
        await refreshBrowserBtn.click();
        await sleep(4000);
      }
      await page.keyboard.press('Escape');
      await sleep(2000);
    }

    // ----------------------------------------------------
    // CENA 10: GIT SOURCE CONTROL & MONACO DIFF EDITOR
    // ----------------------------------------------------
    console.log('📌 Cena 10: Abrindo Painel Git & Monaco Diff...');
    const gitTabBtn = page.locator('button[title*="Source Control"], button[title*="Controle de Versão"], button[title*="Git"], button:has(.codicon-source-control)').first();
    if (await gitTabBtn.isVisible({ timeout: 4000 })) {
      await gitTabBtn.click();
      await sleep(2500);

      const gitModifiedFile = page.locator('.git-file-item, div:has-text("package.json"), div:has-text("server.js"), div:has-text("test.js")').first();
      if (await gitModifiedFile.isVisible({ timeout: 3500 })) {
        console.log('📌 Exibindo Monaco Diff Editor lado a lado...');
        await gitModifiedFile.click();
        await sleep(4500);
      }

      // Retorna para o Explorer
      const explorerBtn = page.locator('button[title*="Explorer"], button:has(.codicon-files)').first();
      if (await explorerBtn.isVisible({ timeout: 3000 })) {
        await explorerBtn.click();
        await sleep(2000);
      }
    }

    // ----------------------------------------------------
    // CENA 11: CHAT COLABORATIVO EM TEMPO REAL
    // ----------------------------------------------------
    console.log('📌 Cena 11: Enviando mensagem no Chat Colaborativo em Tempo Real...');
    const chatInput = page.locator('.chat-input textarea, textarea[placeholder*="Digite uma mensagem"], textarea[placeholder*="message"]').first();
    if (await chatInput.isVisible({ timeout: 4000 })) {
      await chatInput.focus();
      await sleep(800);
      await page.keyboard.insertText('🚀 Servidor Express online na porta 3000 e sincronizado via WebSockets!');
      await sleep(1000);
      await page.keyboard.press('Enter');
      await sleep(3500);
    }

    // ----------------------------------------------------
    // CENA 12: WHITEBOARD COLABORATIVO (EXCALIDRAW)
    // ----------------------------------------------------
    console.log('📌 Cena 12: Abrindo Lousa Virtual (Whiteboard / Excalidraw)...');
    const whiteboardTabBtn = page.locator('button:has-text("Whiteboard"), button[title*="Whiteboard"], button:has(.codicon-edit)').first();
    if (await whiteboardTabBtn.isVisible({ timeout: 4000 })) {
      await whiteboardTabBtn.click();
      console.log('📌 Excalidraw Whiteboard carregado!');
      await sleep(5000);

      // Retorna para a visão de código (botão com texto "Editor" ou title "Editor de Código")
      const codeTabBtn = page.locator('button:has-text("Editor"), button[title*="Editor"], button:has-text("Código"), button:has(.codicon-code)').first();
      if (await codeTabBtn.isVisible({ timeout: 3000 })) {
        await codeTabBtn.click();
        await sleep(2000);
      }
    }

    // ----------------------------------------------------
    // CENA 13: TERMINAL MULTI-ABAS
    // ----------------------------------------------------
    console.log('📌 Cena 13: Criando 2ª aba no Terminal Linux PTY...');
    const addTerminalBtn = page.locator('button[title*="Criar novo terminal"], button[title*="New Terminal"], button:has-text("Novo Terminal"), button:has(.codicon-plus)').first();
    if (await addTerminalBtn.isVisible({ timeout: 3500 })) {
      await addTerminalBtn.click();
      console.log('📌 Nova aba criada. Aguardando inicialização do Terminal 2...');
      await sleep(3500);

      // Clica na aba do Terminal 2 explicitamente
      const term2Tab = page.locator('div:has-text("Terminal 2")').last();
      if (await term2Tab.isVisible({ timeout: 2000 })) {
        await term2Tab.click();
        await sleep(500);
      }

      await typeIntoTerminal(page, 'node -v && git --version', 65);
      await sleep(4000);
    }

    // ----------------------------------------------------
    // CENA 14: MODAL DE COMPARTILHAMENTO & CONVITE
    // ----------------------------------------------------
    console.log('📌 Cena 14: Abrindo Modal de Compartilhamento & Convite...');
    const shareBtn = page.locator('button[title*="Share"], button:has-text("Compartilhar"), button[title*="Compartilhar"], button:has(.codicon-share)').first();
    if (await shareBtn.isVisible({ timeout: 3500 })) {
      await shareBtn.click();
      await sleep(3500);
      const closeShareBtn = page.locator('div.fixed button:has-text("Fechar"), div.fixed button:has-text("Close")').last();
      if (await closeShareBtn.isVisible({ timeout: 2000 })) {
        await closeShareBtn.click();
      } else {
        await page.locator('div.fixed.inset-0').first().click({ force: true, position: { x: 10, y: 10 } });
      }
      await sleep(2000);
    }

    // ----------------------------------------------------
    // CENA 15: CONFIGURAÇÕES, IDIOMA (i18n) & TEMAS
    // ----------------------------------------------------
    console.log('📌 Cena 15: Abrindo Modal de Configurações (i18n & Temas)...');
    const settingsBtn = page.locator('button[title*="Settings"], button[title*="Configurações"], button:has(.codicon-settings-gear)').first();
    if (await settingsBtn.isVisible({ timeout: 4000 })) {
      await settingsBtn.click();
      await sleep(3500);

      // Alternar tema seletor
      const themeSelect = page.locator('select').first();
      if (await themeSelect.isVisible({ timeout: 2000 })) {
        const themesToTry = ['cyber_glass', 'dracula', 'aurora', 'neobrutalism-dark'];
        for (const t of themesToTry) {
          try {
            await themeSelect.selectOption(t);
            await sleep(2000);
          } catch (_) {}
        }
      }

      await sleep(2500);
      const closeSettingsBtn = page.locator('div.fixed button:has-text("Fechar"), div.fixed button:has-text("Close")').last();
      if (await closeSettingsBtn.isVisible({ timeout: 2000 })) {
        await closeSettingsBtn.click();
      } else {
        await page.keyboard.press('Escape');
      }
      await sleep(2000);
    }

    console.log('🏁 Gravação Master Completa concluída com sucesso!');
    await sleep(4000);

  } catch (err) {
    console.error('⚠️ Erro durante o fluxo de gravação:', err.message);
  } finally {
    const video = page.video();
    if (video) {
      const finalFileName = `codesync-showcase-master-${Date.now()}.webm`;
      const finalPath = path.join(OUTPUT_DIR, finalFileName);
      try {
        await video.saveAs(finalPath);
        console.log(`\n======================================================`);
        console.log(`🎉 Gravação Finalizada com SUCESSO!`);
        console.log(`📹 Vídeo 1080p salvo em: ${finalPath}`);
        console.log(`======================================================\n`);
      } catch (err) {
        console.warn('Vídeo sendo finalizado pelo Playwright...');
      }
    }
    await page.close().catch(() => {});
    await context.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

recordDemo();
