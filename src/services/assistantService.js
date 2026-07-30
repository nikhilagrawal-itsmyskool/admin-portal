import api from '../config/api';

// Conversational student assistant. `ask` is stateless: the client holds the current
// student `context` (returned by a prior turn) and echoes it back on each turn.
export const assistantService = {
  // { question, context? } -> { speech, card?, context, needsDisambiguation?, candidates? }
  ask: async (payload) => {
    const response = await api.post('/assistant/ask', payload);
    return response.data;
  },
};
