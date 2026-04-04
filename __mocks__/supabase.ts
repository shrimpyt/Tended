// Mock for lib/supabase
export const supabase = {
  from: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  insert: jest.fn().mockReturnThis(),
  update: jest.fn().mockReturnThis(),
  delete: jest.fn().mockReturnThis(),
  eq: jest.fn().mockReturnThis(),
  gte: jest.fn().mockReturnThis(),
  lte: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  order: jest.fn().mockReturnThis(),
  single: jest.fn().mockResolvedValue({data: null, error: null}),
  then: jest.fn(),
  channel: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  subscribe: jest.fn().mockReturnValue({}),
  removeChannel: jest.fn(),
  auth: {
    signOut: jest.fn().mockResolvedValue({error: null}),
    getSession: jest.fn().mockResolvedValue({data: {session: null}, error: null}),
    onAuthStateChange: jest.fn().mockReturnValue({data: {subscription: {unsubscribe: jest.fn()}}}),
  },
};
