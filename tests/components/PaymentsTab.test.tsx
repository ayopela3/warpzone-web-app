import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { PaymentsTab } from '@/features/admin/components/PaymentsTab'

// Mock fetch
global.fetch = jest.fn()

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})

describe('PaymentsTab Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue('test-session-id')
  })

  describe('Component Rendering', () => {
    it('renders without crashing', () => {
      render(<PaymentsTab />)
      expect(screen.getByText('Payment Filters')).toBeInTheDocument()
      expect(screen.getByText('Payment Management')).toBeInTheDocument()
    })

    it('renders all filter inputs', () => {
      render(<PaymentsTab />)
      expect(screen.getByLabelText('Payment Status')).toBeInTheDocument()
      expect(screen.getByLabelText('Date From')).toBeInTheDocument()
      expect(screen.getByLabelText('Date To')).toBeInTheDocument()
      expect(screen.getByLabelText('User ID')).toBeInTheDocument()
      expect(screen.getByLabelText('Seller ID')).toBeInTheDocument()
    })

    it('renders export PDF button', () => {
      render(<PaymentsTab />)
      expect(screen.getByText('Export PDF')).toBeInTheDocument()
    })
  })

  describe('Select Component Validation', () => {
    it('does not have empty string values in SelectItem', () => {
      render(<PaymentsTab />)
      const selectItems = screen.getAllByRole('option')
      selectItems.forEach(item => {
        expect(item).not.toHaveValue('')
      })
    })

    it('handles status filter changes correctly', async () => {
      render(<PaymentsTab />)
      const statusSelect = screen.getByLabelText('Payment Status')
      
      fireEvent.click(statusSelect)
      const pendingOption = screen.getByText('Pending')
      fireEvent.click(pendingOption)
      
      expect(statusSelect).toHaveValue('pending')
    })

    it('converts "all" to empty string for API calls', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          expect.stringContaining('page=1&limit=50'),
          expect.any(Object)
        )
      })
    })
  })

  describe('API Error Handling', () => {
    it('handles network errors gracefully', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<PaymentsTab />)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to fetch payments')
      })
    })

    it('handles API error responses', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: false,
          error: 'Authentication failed'
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Authentication failed')
      })
    })

    it('handles undefined API responses', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: undefined,
          pagination: undefined
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Management (0 payments)')).toBeInTheDocument()
      })
    })
  })

  describe('Data Rendering Safety', () => {
    it('renders payments with missing properties safely', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: [
            {
              id: 'test-id',
              // Missing other properties
            },
            {
              // Missing all properties
            }
          ],
          pagination: { page: 1, limit: 50, total: 2, totalPages: 1, hasNext: false, hasPrev: false }
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        expect(screen.getByText('N/A')).toBeInTheDocument()
        expect(screen.getByText('₱0')).toBeInTheDocument()
      })
    })

    it('renders empty payments list', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Management (0 payments)')).toBeInTheDocument()
      })
    })
  })

  describe('Payment Actions', () => {
    it('opens approval dialog when approve is clicked', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: [
            {
              id: 'test-id',
              user_email: 'test@example.com',
              total: 100,
              payment_status: 'pending'
            }
          ],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        const actionsButton = screen.getByRole('button', { name: /actions/i })
        fireEvent.click(actionsButton)
        
        const approveButton = screen.getByText('Approve')
        fireEvent.click(approveButton)
        
        expect(screen.getByText('Approve Payment')).toBeInTheDocument()
      })
    })

    it('opens rejection dialog when reject is clicked', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: [
            {
              id: 'test-id',
              user_email: 'test@example.com',
              total: 100,
              payment_status: 'pending'
            }
          ],
          pagination: { page: 1, limit: 50, total: 1, totalPages: 1, hasNext: false, hasPrev: false }
        })
      })

      render(<PaymentsTab />)
      
      await waitFor(() => {
        const actionsButton = screen.getByRole('button', { name: /actions/i })
        fireEvent.click(actionsButton)
        
        const rejectButton = screen.getByText('Reject')
        fireEvent.click(rejectButton)
        
        expect(screen.getByText('Reject Payment')).toBeInTheDocument()
      })
    })
  })

  describe('PDF Export', () => {
    it('handles PDF export errors', async () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          payments: [],
          pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNext: false, hasPrev: false }
        })
      })

      render(<PaymentsTab />)
      
      const exportButton = screen.getByText('Export PDF')
      fireEvent.click(exportButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Failed to export PDF')
      })
    })
  })

  describe('Loading States', () => {
    it('shows loading spinner while fetching', () => {
      const mockFetch = fetch as jest.MockedFunction<typeof fetch>
      mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<PaymentsTab />)
      expect(screen.getByRole('status')).toBeInTheDocument() // Loading spinner
    })
  })
})
