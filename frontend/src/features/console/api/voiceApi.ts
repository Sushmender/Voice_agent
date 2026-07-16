import api from '../../../lib/axios';

export interface TokenResponse {
  token: string;
  livekit_url: string;
}

export async function getToken(
  roomName: string,
  participantName: string
): Promise<TokenResponse> {
  const { data } = await api.post<TokenResponse>('/api/token', {
    room_name: roomName,
    participant_name: participantName,
  });
  return data;
}
