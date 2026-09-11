/**
 * CareBridge — Seed: Guiding Care Decisions
 * --------------------------------------------------
 * Este script importa referências (links externos) das secções do site
 * "Ethics in Dementia Care — A Reflective Resource"
 * (https://guiding-care-decisions.lovable.app/)
 *
 * robots.txt do site: "User-agent: * / Allow: /" — crawling e referenciação permitidos.
 *
 * ABORDAGEM: Em vez de copiar texto integralmente, criamos registos com:
 *   - Título em Português
 *   - Descrição original (resumo académico) em Português
 *   - file_path = URL da secção de origem (link externo)
 *   - Categoria = "Recurso Externo"
 *   - Fonte identificada nos metadados
 *
 * COMO EXECUTAR (uma só vez):
 *   bun run scripts/seed-guiding-care.js
 *
 * IDEMPOTENTE: verifica se já existe pelo título antes de inserir.
 */

import { getDb, initializeDatabase } from '../config/database.js';

const GUIDING_CARE_RESOURCES = [
  {
    title: 'Compreender a Demência — Etapas, Sintomas e Impacto',
    category: 'Recurso Externo',
    description: 'Visão geral académica das fases da demência (inicial, moderada e avançada), alterações cognitivas e comportamentais associadas, e o impacto na autonomia da pessoa cuidada. Recurso de base para qualquer cuidador que queira compreender melhor a evolução da doença. Fonte: Guiding Care Decisions (guiding-care-decisions.lovable.app)',
    file_path: 'https://guiding-care-decisions.lovable.app/understanding-dementia'
  },
  {
    title: 'Quadros Éticos — EDEM e Nuffield para Cuidados de Demência',
    category: 'Recurso Externo',
    description: 'Apresentação integrada de dois quadros complementares: o Quadro EDEM (princípios de dignidade, autonomia, consentimento, personhood, igualdade e responsabilidade partilhada) e a abordagem baseada em casos do Nuffield Council on Bioethics. Juntos formam um modelo de decisão ético robusto para situações de cuidados diários. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/frameworks'
  },
  {
    title: 'Dilemas Éticos no Dia a Dia — Verdade, Segurança, Condução e Mais',
    category: 'Recurso Externo',
    description: 'Análise prática de dilemas éticos reais enfrentados por cuidadores informais: dever de dizer a verdade vs. conforto emocional, equilibrar segurança e independência, condução, cuidados pessoais, medicação e contenção. Aborda cada cenário com referências aos princípios éticos aplicáveis. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/dilemmas'
  },
  {
    title: 'Tomada de Decisão e Capacidade — Como Avaliar e Apoiar',
    category: 'Recurso Externo',
    description: 'Guia sobre como a capacidade decisória se altera ao longo da demência, estratégias para apoiar escolhas da pessoa cuidada, e como ponderar desejos passados vs. estado presente. Inclui orientações sobre quando e como envolver profissionais de saúde ou representantes legais. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/decision-making'
  },
  {
    title: 'A Jornada de Cuidados — Da Fase Inicial à Fase Avançada',
    category: 'Recurso Externo',
    description: 'Avaliação das necessidades de cuidados ao longo das fases precoce, intermédia e avançada da demência. Inclui orientações sobre serviços comunitários, apoio domiciliário e transição para cuidados institucionais. Ferramenta de planeamento antecipado para cuidadores informais. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/care-journey'
  },
  {
    title: 'Comunicação e Cuidados Centrados na Pessoa',
    category: 'Recurso Externo',
    description: 'Abordagens de comunicação que preservam a dignidade e constroem confiança: linguagem centrada na pessoa, comunicação não-verbal, adaptação às fases da demência e técnicas para reduzir agitação e desorientação. Recurso prático para o dia a dia de qualquer cuidador. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/communication'
  },
  {
    title: 'Apoio ao Cuidador — Bem-estar como Obrigação Ética',
    category: 'Recurso Externo',
    description: 'Argumentação académica sobre por que o bem-estar do cuidador é, em si, uma obrigação ética — não um luxo. Inclui sinais de esgotamento (burnout), estratégias de autocuidado, quando procurar ajuda exterior e como aceder a redes de apoio formais e informais. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/caregiver-support'
  },
  {
    title: 'Fichas de Reflexão para Decisões Difíceis (10 Worksheets)',
    category: 'Recurso Externo',
    description: 'Dez fichas de trabalho estruturadas para ajudar cuidadores a refletir sobre decisões complexas antes de as tomar. Incluem questões guias que movem o foco da autocrítica para a clareza de valores. Disponíveis para consulta e impressão diretamente no site de origem. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/worksheets'
  },
  {
    title: 'Ferramentas de Reflexão Ética — Da Autocrítica à Clareza',
    category: 'Recurso Externo',
    description: 'Conjunto de perguntas reflexivas simples que ajudam cuidadores a mover-se do ciclo de autocensura para maior clareza de valores e ação. Complementa as fichas de trabalho com uma abordagem mais informal e acessível para uso quotidiano. Fonte: Guiding Care Decisions',
    file_path: 'https://guiding-care-decisions.lovable.app/reflection'
  }
];

async function seedGuidingCare() {
  console.log('🌱 A inicializar base de dados...');
  await initializeDatabase();
  const db = await getDb();

  // Obter o ID do admin demo para usar como "uploader"
  const adminUser = await db.get("SELECT id FROM users WHERE role = 'admin' LIMIT 1");
  const uploadedBy = adminUser ? adminUser.id : 1;

  console.log(`👤 A usar utilizador ID ${uploadedBy} como fonte dos registos.`);
  console.log('📚 A verificar e inserir recursos do Guiding Care Decisions...\n');

  let inserted = 0;
  let skipped = 0;

  for (const resource of GUIDING_CARE_RESOURCES) {
    // Idempotente: verificar se já existe pelo título
    const existing = await db.get('SELECT id FROM documents WHERE title = ?', [resource.title]);

    if (existing) {
      console.log(`  ⏭️  Já existe: "${resource.title.substring(0, 60)}..."`);
      skipped++;
    } else {
      await db.run(
        'INSERT INTO documents (title, category, description, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?)',
        [resource.title, resource.category, resource.description, resource.file_path, uploadedBy]
      );
      console.log(`  ✅ Inserido: "${resource.title.substring(0, 60)}..."`);
      inserted++;
    }
  }

  console.log(`\n🎉 Concluído! ${inserted} recurso(s) inserido(s), ${skipped} já existente(s).`);
  console.log('ℹ️  Estes recursos aparecem na Biblioteca de Recursos com a categoria "Recurso Externo".');
  console.log('📌 TODO (fase RAG): Integrar o conteúdo destes URLs no contexto do chat AllyCare via embeddings.');

  process.exit(0);
}

seedGuidingCare().catch(err => {
  console.error('❌ Erro durante o seed:', err);
  process.exit(1);
});
