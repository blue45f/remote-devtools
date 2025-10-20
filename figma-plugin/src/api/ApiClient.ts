import axios, { AxiosInstance } from 'axios'

export interface UserInfo {
  id: string
  name: string
  username?: string // 회사 username
  photoUrl?: string
  color?: {
    r: number
    g: number
    b: number
    a: number
  }
}

export class ApiClient {
  private client: AxiosInstance
  private apiKey?: string

  constructor(baseURL: string, apiKey?: string) {
    this.apiKey = apiKey
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey }),
      },
    })

    // Request interceptor - 디버깅용
    this.client.interceptors.request.use(
      (config) => {
        return config
      },
      (error) => {
        console.error('❌ Request Error:', error)
        return Promise.reject(error)
      },
    )

    // Response interceptor - 디버깅용
    this.client.interceptors.response.use(
      (response) => {
        return response
      },
      (error) => {
        console.error('❌ Response Error:', error.response?.data || error.message)
        return Promise.reject(error)
      },
    )
  }

  // 연결 테스트
  public async testConnection(): Promise<boolean> {
    try {
      const response = await this.client.get('/health')
      return response.status === 200
    } catch (error) {
      // health 엔드포인트가 없는 경우를 위한 fallback
      try {
        const response = await this.client.get('/')
        return response.status < 400
      } catch {
        return false
      }
    }
  }

  // 사용자 정보 및 디바이스 정보 조회
  public async registerUser(userInfo: UserInfo): Promise<any> {
    try {
      const payload = {
        userId: userInfo.id,
        username: userInfo.username,
        photoUrl: userInfo.photoUrl,
        color: userInfo.color,
        timestamp: new Date().toISOString(),
      }
      
      console.log('[registerUser] API 호출:', '/api/figma/user', payload)

      const response = await this.client.post('/api/figma/user', payload)
      console.log('[registerUser] API 응답:', response.data)
      
      return response.data
    } catch (error) {
      console.error('Failed to register user:', error)
      throw error
    }
  }

  // 녹화 세션 리스트 조회
  public async getUserSessions(deviceId: string): Promise<any> {
    try {
      const response = await this.client.get('/sessions/user-sessions', {
        params: { deviceId },
      })
      return response.data
    } catch (error) {
      console.error('Failed to get user sessions:', error)
      throw error
    }
  }

  // 티켓 리스트 조회
  public async getUserTickets(deviceId: string): Promise<any> {
    try {
      const response = await this.client.get('/sessions/user-tickets', {
        params: { deviceId },
      })
      return response.data
    } catch (error) {
      console.error('Failed to get user tickets:', error)
      throw error
    }
  }

  // 녹화 세션 상세 정보 조회 (screenPreview 포함) - sessionName 사용
  public async getSessionDetail(sessionName: string): Promise<any> {
    try {
      const response = await this.client.get('/sessions/session-detail', {
        params: { sessionName },
      })
      return response.data
    } catch (error) {
      console.error('Failed to get session detail:', error)
      throw error
    }
  }

  /**
   * JIRA에 이미지 업로드
   */
  public async uploadImageToJira(issueId: string, formData: FormData): Promise<any> {
    try {
      const response = await this.client.post(`/jira/issues/${issueId}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })

      return response.data
    } catch (error) {
      console.error('JIRA 업로드 에러:', error)
      throw error
    }
  }

  /**
   * 스크린샷 데이터 가져오기
   * @param recordId - 기록 ID
   * @param fullPage - 전체 페이지 캡처 여부 (기본값: true - 전체 body 캡처)
   */
  public async getScreenshot(recordId: number, fullPage: boolean = true): Promise<any> {
    try {
      const response = await this.client.get('/sessions/generate-screenshot', {
        params: { recordId, fullPage },
      })
      return response.data
    } catch (error) {
      console.error('Failed to get screenshot:', error)
      throw error
    }
  }
}
