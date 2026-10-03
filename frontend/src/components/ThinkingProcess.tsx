/**
 * 思考过程可视化组件
 *
 * 展示自研大脑的完整思考链路：
 * - 思考阶段（感知→注意→理解→联想→推理→决策→草拟）
 * - tt('think.title')与目标
 * - 元认知评估（tt('think.understanding')/tt('think.trust')/tt('think.gap')/策略）
 * - tt('think.knowledgeQuery')（来源/要点）
 * - 活跃概念与情绪状态
 * - 内在叙事
 */
import { useState } from 'react';
import { t as tt } from '../i18n';
import {
  Box,
  Typography,
  Collapse,
  IconButton,
  Chip,
  LinearProgress,
  Divider,
  Tooltip,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import PsychologyIcon from '@mui/icons-material/Psychology';
import LightbulbIcon from '@mui/icons-material/Lightbulb';
import SchoolIcon from '@mui/icons-material/School';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import type { BrainState } from '../services/LLMApiService';

interface ThinkingProcessProps {
  brainState: BrainState;
  responseTime?: number;
}

// 思考阶段中文标签
const PHASE_LABELS: Record<string, string> = {
  perception: tt('think.perception'),
  attention: tt('think.attention'),
  comprehension: tt('think.comprehension'),
  association: tt('think.association'),
  reasoning: tt('think.reasoning'),
  decision: tt('think.decision'),
  drafting: tt('think.drafting'),
};

// tt('think.gap')中文标签
const GAP_LABELS: Record<string, string> = {
  factual: tt('think.factual'),
  procedural: tt('think.procedural'),
  conceptual: tt('think.conceptual'),
  none: tt('think.noGap'),
};

// 策略中文标签
const STRATEGY_LABELS: Record<string, string> = {
  seek_knowledge: tt('think.seekKnowledge'),
  reasoning: tt('think.reasoning'),
  ask_user: tt('think.askUser'),
  none: tt('think.none'),
};

// 情绪标签中文映射
const MOOD_LABELS: Record<string, string> = {
  happy: tt('think.happy'),
  sad: tt('think.sad'),
  neutral: tt('think.neutral'),
  excited: tt('think.excited'),
  calm: tt('think.calm'),
  anxious: tt('think.anxious'),
  focused: tt('think.focused'),
  curious: tt('think.curious'),
};

export default function ThinkingProcess({ brainState, responseTime }: ThinkingProcessProps) {
  const [expanded, setExpanded] = useState(false);

  if (!brainState) return null;

  const thoughtChain = brainState.thought_chain;
  const metacognition = brainState.metacognition;
  const knowledgeQuery = brainState.knowledge_query;
  const selfNarrative = brainState.self_narrative;
  const activeConcepts = brainState.active_concepts || [];
  const moodLabel = brainState.mood_label || brainState.mood || 'neutral';
  const activity = brainState.activity ?? 0;

  return (
    <Box
      sx={{
        mt: 1,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1,
        overflow: 'hidden',
        bgcolor: 'action.hover',
      }}
    >
      {/* 折叠标题栏 */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1.5,
          py: 0.75,
          cursor: 'pointer',
          userSelect: 'none',
          '&:hover': { bgcolor: 'action.selected' },
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PsychologyIcon fontSize="small" color="primary" />
          <Typography variant="caption" sx={{ fontWeight: 600 }}>
            思考过程
          </Typography>
          {thoughtChain?.phases && (
            <Chip
              size="small"
              label={`${thoughtChain.phases.length} ${tt('think.phases')}`}
              sx={{ height: 18, fontSize: 11 }}
            />
          )}
          {responseTime !== undefined && (
            <Typography variant="caption" sx={{ opacity: 0.6, fontSize: 11 }}>
              {responseTime.toFixed(0)}ms
            </Typography>
          )}
        </Box>
        <IconButton size="small" sx={{ p: 0.25 }}>
          <ExpandMoreIcon
            fontSize="small"
            sx={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
          />
        </IconButton>
      </Box>

      {/* 展开内容 */}
      <Collapse in={expanded}>
        <Box sx={{ p: 1.5, pt: 0 }}>
          {/* 思考阶段链 */}
          {thoughtChain?.phases && thoughtChain.phases.length > 0 && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                思考阶段
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {thoughtChain.phases.map((phase, idx) => (
                  <Tooltip key={idx} title={PHASE_LABELS[phase] || phase} arrow>
                    <Chip
                      size="small"
                      label={PHASE_LABELS[phase] || phase}
                      color="primary"
                      variant="outlined"
                      sx={{ height: 20, fontSize: 11 }}
                    />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}

          {/* tt('think.title')与目标 */}
          {thoughtChain?.direction && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                <LightbulbIcon sx={{ fontSize: 14 }} /> tt('think.title')
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 12, pl: 2 }}>
                {thoughtChain.direction}
              </Typography>
            </Box>
          )}

          {thoughtChain?.goal && (
            <Box sx={{ mb: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                当前目标
              </Typography>
              <Typography variant="body2" sx={{ fontSize: 12, pl: 2, fontStyle: 'italic' }}>
                {thoughtChain.goal}
              </Typography>
            </Box>
          )}

          {/* 元认知评估 */}
          {metacognition && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  元认知评估
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {metacognition.understanding !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ width: 56, fontSize: 11 }}>{tt('think.understanding')}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={metacognition.understanding * 100}
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" sx={{ fontSize: 11, width: 32 }}>
                        {(metacognition.understanding * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  )}
                  {metacognition.confidence !== undefined && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ width: 56, fontSize: 11 }}>{tt('think.trust')}</Typography>
                      <LinearProgress
                        variant="determinate"
                        value={metacognition.confidence * 100}
                        color="secondary"
                        sx={{ flex: 1, height: 6, borderRadius: 3 }}
                      />
                      <Typography variant="caption" sx={{ fontSize: 11, width: 32 }}>
                        {(metacognition.confidence * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  )}
                  {metacognition.knowledge_gap && metacognition.knowledge_gap !== 'none' && (
                    <Box sx={{ display: 'flex', gap: 1, mb: 0.5 }}>
                      <Typography variant="caption" sx={{ width: 56, fontSize: 11 }}>{tt('think.gap')}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 11 }}>
                        {GAP_LABELS[metacognition.knowledge_gap] || metacognition.knowledge_gap}
                      </Typography>
                    </Box>
                  )}
                  {metacognition.strategy && metacognition.strategy !== 'none' && (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Typography variant="caption" sx={{ width: 56, fontSize: 11 }}>{tt('think.strategy')}</Typography>
                      <Typography variant="caption" sx={{ fontSize: 11 }}>
                        {STRATEGY_LABELS[metacognition.strategy] || metacognition.strategy}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            </>
          )}

          {/* tt('think.knowledgeQuery') */}
          {knowledgeQuery && knowledgeQuery.key_points && knowledgeQuery.key_points.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <SchoolIcon sx={{ fontSize: 14 }} /> tt('think.knowledgeQuery')
                  {knowledgeQuery.source && (
                    <Chip
                      size="small"
                      label={knowledgeQuery.source}
                      sx={{ height: 16, fontSize: 10, ml: 0.5 }}
                    />
                  )}
                </Typography>
                <Box sx={{ pl: 2 }}>
                  {knowledgeQuery.key_points.map((point, idx) => (
                    <Typography key={idx} variant="body2" sx={{ fontSize: 12, mb: 0.25 }}>
                      • {point}
                    </Typography>
                  ))}
                </Box>
              </Box>
            </>
          )}

          {/* 活跃概念 */}
          {activeConcepts.length > 0 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  活跃概念
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                  {activeConcepts.map((concept, idx) => (
                    <Chip
                      key={idx}
                      size="small"
                      label={concept}
                      variant="outlined"
                      sx={{ height: 18, fontSize: 11 }}
                    />
                  ))}
                </Box>
              </Box>
            </>
          )}

          {/* 内在状态 */}
          {(selfNarrative?.thought || selfNarrative?.feeling) && (
            <>
              <Divider sx={{ my: 1 }} />
              <Box sx={{ mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', mb: 0.5 }}>
                  内在状态
                </Typography>
                <Box sx={{ pl: 2, display: 'flex', flexDirection: 'column', gap: 0.25 }}>
                  {selfNarrative.thought && (
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      <span style={{ opacity: 0.7 }}>{tt('think.idea')}</span>{selfNarrative.thought}
                    </Typography>
                  )}
                  {selfNarrative.feeling && (
                    <Typography variant="body2" sx={{ fontSize: 12 }}>
                      <span style={{ opacity: 0.7 }}>{tt('think.feeling')}</span>{selfNarrative.feeling}
                    </Typography>
                  )}
                </Box>
              </Box>
            </>
          )}

          {/* 情绪与活动度 */}
          <Divider sx={{ my: 1 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <EmojiEmotionsIcon sx={{ fontSize: 14 }} />
            <Typography variant="caption" sx={{ fontSize: 11 }}>
              情绪：{MOOD_LABELS[moodLabel] || moodLabel}
            </Typography>
            <Typography variant="caption" sx={{ fontSize: 11, opacity: 0.7 }}>
              活动度：{(activity * 100).toFixed(0)}%
            </Typography>
            {brainState.active_goal && (
              <Typography variant="caption" sx={{ fontSize: 11, opacity: 0.7 }}>
                目标：{brainState.active_goal}
              </Typography>
            )}
          </Box>
        </Box>
      </Collapse>
    </Box>
  );
}
