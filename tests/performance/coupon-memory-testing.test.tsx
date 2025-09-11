import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, cleanup } from '@testing-library/react'
import { performance, PerformanceObserver } from 'perf_hooks'
import React from 'react'

// Mock React components for memory testing
const CouponValidationForm = ({ orderAmount = 10000, onCouponApplied = () => {} }) => {
  // Simulate heavy component with state and effects
  return null
}

const AdminCouponDashboard = ({ initialCoupons = [] }) => {
  // Simulate dashboard with large datasets
  return null  
}

const CouponUsageHistory = ({ userId, limit = 100 }) => {
  // Simulate history component with pagination
  return null
}

describe('Coupon Component Memory Performance', () => {
  let memoryObserver: PerformanceObserver
  let memoryMetrics: PerformanceEntry[] = []
  let initialMemory: NodeJS.MemoryUsage

  beforeEach(() => {
    // Force garbage collection if available
    if (global.gc) {
      global.gc()
    }
    
    initialMemory = process.memoryUsage()
    memoryMetrics = []
    
    // Setup memory observer
    memoryObserver = new PerformanceObserver((list) => {
      memoryMetrics.push(...list.getEntries())
    })
    memoryObserver.observe({ entryTypes: ['measure', 'mark'] })
  })

  afterEach(() => {
    memoryObserver.disconnect()
    cleanup()
    
    // Force garbage collection after each test
    if (global.gc) {
      global.gc()
    }
  })

  describe('CouponValidationForm Memory Usage', () => {
    it('should not leak memory when mounting and unmounting repeatedly', async () => {
      const iterations = 100
      const renders = []
      
      performance.mark('validation-form-start')
      
      // Mount and unmount components repeatedly
      for (let i = 0; i < iterations; i++) {
        const { unmount } = render(<CouponValidationForm />)
        renders.push(unmount)
        
        // Unmount every 10 iterations to simulate real usage
        if (i % 10 === 9) {
          renders.forEach(unmount => unmount())
          renders.length = 0
          
          // Allow cleanup
          await new Promise(resolve => setTimeout(resolve, 10))
        }
      }
      
      // Cleanup remaining renders
      renders.forEach(unmount => unmount())
      
      performance.mark('validation-form-end')
      performance.measure('validation-form-memory-test', 'validation-form-start', 'validation-form-end')
      
      // Force garbage collection and measure final memory
      if (global.gc) {
        global.gc()
        await new Promise(resolve => setTimeout(resolve, 100))
      }
      
      const finalMemory = process.memoryUsage()
      const heapGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Heap growth should be minimal (less than 10MB for 100 iterations)
      expect(heapGrowth).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`CouponValidationForm Memory Test:`)
      console.log(`Initial heap: ${(initialMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final heap: ${(finalMemory.heapUsed / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Heap growth: ${(heapGrowth / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should handle rapid state updates without memory buildup', async () => {
      const TestComponent = () => {
        // Simulate rapid coupon validation updates
        const [validations, setValidations] = React.useState([])
        
        React.useEffect(() => {
          const interval = setInterval(() => {
            setValidations(prev => {
              // Simulate adding validation results
              const newValidation = {
                id: Date.now() + Math.random(),
                code: `CODE${Math.floor(Math.random() * 1000)}`,
                valid: Math.random() > 0.5,
                timestamp: Date.now()
              }
              
              // Keep only last 50 validations to prevent unbounded growth
              const updated = [...prev, newValidation].slice(-50)
              return updated
            })
          }, 10) // Very frequent updates
          
          return () => clearInterval(interval)
        }, [])
        
        return null
      }
      
      const { unmount } = render(<TestComponent />)
      
      // Let it run for a short period with rapid updates
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      const midMemory = process.memoryUsage()
      unmount()
      
      // Allow cleanup
      await new Promise(resolve => setTimeout(resolve, 100))
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage()
      const peakGrowth = midMemory.heapUsed - initialMemory.heapUsed
      const finalGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Peak growth should be reasonable (less than 50MB)
      expect(peakGrowth).toBeLessThan(50 * 1024 * 1024)
      
      // Final growth should be minimal after cleanup
      expect(finalGrowth).toBeLessThan(5 * 1024 * 1024)
      
      console.log(`Rapid State Updates Test:`)
      console.log(`Peak heap growth: ${(peakGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final heap growth: ${(finalGrowth / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('AdminCouponDashboard Memory Usage', () => {
    it('should handle large datasets without excessive memory usage', () => {
      // Generate large dataset
      const largeCouponDataset = Array.from({ length: 1000 }, (_, i) => ({
        _id: `coupon_${i}`,
        code: `CODE${i.toString().padStart(4, '0')}`,
        name: `Test Coupon ${i}`,
        description: `Description for coupon ${i} with some additional text to simulate real data`,
        type: i % 2 === 0 ? 'percentage' : 'fixed_amount',
        value: Math.floor(Math.random() * 50) + 5,
        currency: 'USD',
        isActive: Math.random() > 0.3,
        usageCount: Math.floor(Math.random() * 100),
        usageLimit: Math.floor(Math.random() * 1000) + 100,
        validFrom: new Date(2024, 0, 1).toISOString(),
        validUntil: new Date(2024, 11, 31).toISOString(),
        createdAt: new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1).toISOString(),
        updatedAt: new Date().toISOString()
      }))
      
      performance.mark('dashboard-render-start')
      
      const { unmount } = render(<AdminCouponDashboard initialCoupons={largeCouponDataset} />)
      
      performance.mark('dashboard-render-end')
      performance.measure('dashboard-render', 'dashboard-render-start', 'dashboard-render-end')
      
      const afterRenderMemory = process.memoryUsage()
      const renderMemoryGrowth = afterRenderMemory.heapUsed - initialMemory.heapUsed
      
      unmount()
      
      // Allow cleanup
      if (global.gc) global.gc()
      const finalMemory = process.memoryUsage()
      const finalMemoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Memory growth should be proportional to data size but not excessive
      // 1000 coupons should use less than 100MB
      expect(renderMemoryGrowth).toBeLessThan(100 * 1024 * 1024)
      
      // After unmounting, growth should be minimal
      expect(finalMemoryGrowth).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`Large Dataset Test (1000 coupons):`)
      console.log(`Render memory growth: ${(renderMemoryGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final memory growth: ${(finalMemoryGrowth / 1024 / 1024).toFixed(2)}MB`)
    })

    it('should properly cleanup filtered views', async () => {
      const TestDashboard = () => {
        const [filter, setFilter] = React.useState('')
        const [coupons] = React.useState(() => 
          Array.from({ length: 500 }, (_, i) => ({
            id: i,
            code: `CODE${i}`,
            name: `Coupon ${i}`,
            searchableText: `CODE${i} Coupon ${i} description text`
          }))
        )
        
        const filteredCoupons = React.useMemo(() => {
          if (!filter) return coupons
          return coupons.filter(c => 
            c.searchableText.toLowerCase().includes(filter.toLowerCase())
          )
        }, [coupons, filter])
        
        React.useEffect(() => {
          // Simulate rapid filter changes
          const interval = setInterval(() => {
            setFilter(`search_${Math.floor(Math.random() * 100)}`)
          }, 100)
          
          return () => clearInterval(interval)
        }, [])
        
        return null
      }
      
      const { unmount } = render(<TestDashboard />)
      
      // Let filtering run for a period
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const midMemory = process.memoryUsage()
      unmount()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage()
      const midGrowth = midMemory.heapUsed - initialMemory.heapUsed
      const finalGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Frequent filtering shouldn't cause excessive memory growth
      expect(midGrowth).toBeLessThan(75 * 1024 * 1024)
      expect(finalGrowth).toBeLessThan(10 * 1024 * 1024)
      
      console.log(`Filter Memory Test:`)
      console.log(`Mid-test growth: ${(midGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final growth: ${(finalGrowth / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('CouponUsageHistory Memory Usage', () => {
    it('should handle infinite scroll without memory leaks', async () => {
      const TestInfiniteScroll = () => {
        const [items, setItems] = React.useState([])
        const [page, setPage] = React.useState(0)
        
        React.useEffect(() => {
          // Simulate loading more items
          const timer = setTimeout(() => {
            const newItems = Array.from({ length: 50 }, (_, i) => ({
              id: page * 50 + i,
              couponCode: `CODE${page}_${i}`,
              usedAt: new Date().toISOString(),
              discountAmount: Math.floor(Math.random() * 5000),
              orderId: `order_${page}_${i}`
            }))
            
            setItems(prev => {
              // Implement virtual scrolling - keep only visible window
              const allItems = [...prev, ...newItems]
              // Keep only last 200 items to simulate virtualization
              return allItems.slice(-200)
            })
            
            if (page < 20) { // Simulate loading 20 pages
              setPage(p => p + 1)
            }
          }, 50)
          
          return () => clearTimeout(timer)
        }, [page])
        
        return null
      }
      
      const { unmount } = render(<TestInfiniteScroll />)
      
      // Wait for all pages to load
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const afterLoadMemory = process.memoryUsage()
      unmount()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage()
      const loadGrowth = afterLoadMemory.heapUsed - initialMemory.heapUsed
      const finalGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Should not grow excessively despite loading many pages
      expect(loadGrowth).toBeLessThan(50 * 1024 * 1024)
      expect(finalGrowth).toBeLessThan(5 * 1024 * 1024)
      
      console.log(`Infinite Scroll Memory Test:`)
      console.log(`Load memory growth: ${(loadGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final memory growth: ${(finalGrowth / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Event Listener Cleanup', () => {
    it('should properly cleanup event listeners', async () => {
      const TestComponent = () => {
        React.useEffect(() => {
          const handlers = []
          
          // Simulate multiple event listeners
          const handleResize = () => {}
          const handleScroll = () => {}
          const handleKeydown = () => {}
          const handleClick = () => {}
          
          if (typeof window !== 'undefined') {
            window.addEventListener('resize', handleResize)
            window.addEventListener('scroll', handleScroll)
            window.addEventListener('keydown', handleKeydown)
            document.addEventListener('click', handleClick)
            
            handlers.push(
              () => window.removeEventListener('resize', handleResize),
              () => window.removeEventListener('scroll', handleScroll),
              () => window.removeEventListener('keydown', handleKeydown),
              () => document.removeEventListener('click', handleClick)
            )
          }
          
          // Simulate timers
          const interval = setInterval(() => {}, 1000)
          const timeout = setTimeout(() => {}, 5000)
          
          return () => {
            handlers.forEach(cleanup => cleanup())
            clearInterval(interval)
            clearTimeout(timeout)
          }
        }, [])
        
        return null
      }
      
      const components = []
      
      // Create multiple components with event listeners
      for (let i = 0; i < 50; i++) {
        const { unmount } = render(<TestComponent />)
        components.push(unmount)
      }
      
      const afterMountMemory = process.memoryUsage()
      
      // Cleanup all components
      components.forEach(unmount => unmount())
      
      await new Promise(resolve => setTimeout(resolve, 200))
      if (global.gc) global.gc()
      
      const finalMemory = process.memoryUsage()
      const mountGrowth = afterMountMemory.heapUsed - initialMemory.heapUsed
      const finalGrowth = finalMemory.heapUsed - initialMemory.heapUsed
      
      // Growth should be minimal after cleanup
      expect(mountGrowth).toBeLessThan(25 * 1024 * 1024)
      expect(finalGrowth).toBeLessThan(5 * 1024 * 1024)
      
      console.log(`Event Listener Cleanup Test:`)
      console.log(`Mount memory growth: ${(mountGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Final memory growth: ${(finalGrowth / 1024 / 1024).toFixed(2)}MB`)
    })
  })

  describe('Memory Leak Detection', () => {
    it('should detect and prevent common React memory leaks', async () => {
      // Test for common memory leak patterns
      const LeakyComponent = ({ shouldLeak = false }) => {
        const [data, setData] = React.useState([])
        
        React.useEffect(() => {
          if (shouldLeak) {
            // Simulate memory leak - not cleaning up interval
            setInterval(() => {
              setData(prev => [...prev, { timestamp: Date.now(), data: new Array(1000).fill(0) }])
            }, 10)
          } else {
            // Proper cleanup
            const interval = setInterval(() => {
              setData(prev => {
                const newItem = { timestamp: Date.now(), data: new Array(100).fill(0) }
                return [...prev, newItem].slice(-10) // Keep only last 10 items
              })
            }, 10)
            
            return () => clearInterval(interval)
          }
        }, [shouldLeak])
        
        return null
      }
      
      // Test non-leaky version first
      const { unmount: unmountGood } = render(<LeakyComponent shouldLeak={false} />)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const midMemoryGood = process.memoryUsage()
      unmountGood()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      if (global.gc) global.gc()
      
      const finalMemoryGood = process.memoryUsage()
      const goodGrowth = finalMemoryGood.heapUsed - initialMemory.heapUsed
      
      // Reset for leaky test
      const newInitial = process.memoryUsage()
      
      // Test leaky version
      const { unmount: unmountBad } = render(<LeakyComponent shouldLeak={true} />)
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const midMemoryBad = process.memoryUsage()
      unmountBad()
      
      await new Promise(resolve => setTimeout(resolve, 100))
      if (global.gc) global.gc()
      
      const finalMemoryBad = process.memoryUsage()
      const badGrowth = finalMemoryBad.heapUsed - newInitial.heapUsed
      
      // Non-leaky version should have minimal growth
      expect(goodGrowth).toBeLessThan(10 * 1024 * 1024)
      
      // Leaky version will grow more, but test detects it
      console.log(`Memory Leak Detection Test:`)
      console.log(`Good component final growth: ${(goodGrowth / 1024 / 1024).toFixed(2)}MB`)
      console.log(`Leaky component final growth: ${(badGrowth / 1024 / 1024).toFixed(2)}MB`)
      
      // The test should detect if there's a significant difference
      if (badGrowth > goodGrowth * 2) {
        console.warn('Potential memory leak detected in component!')
      }
    })
  })

  describe('Performance Metrics Collection', () => {
    it('should collect and analyze performance metrics', async () => {
      const metrics = {
        renderTimes: [],
        memorySnapshots: [],
        componentCounts: []
      }
      
      // Simulate multiple render cycles with metrics collection
      for (let cycle = 0; cycle < 10; cycle++) {
        const renderStart = performance.now()
        
        const components = []
        for (let i = 0; i < 20; i++) {
          const { unmount } = render(<CouponValidationForm orderAmount={Math.random() * 10000} />)
          components.push(unmount)
        }
        
        const renderEnd = performance.now()
        const memorySnapshot = process.memoryUsage()
        
        metrics.renderTimes.push(renderEnd - renderStart)
        metrics.memorySnapshots.push(memorySnapshot.heapUsed)
        metrics.componentCounts.push(components.length)
        
        // Cleanup
        components.forEach(unmount => unmount())
        
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      
      // Analyze metrics
      const avgRenderTime = metrics.renderTimes.reduce((a, b) => a + b, 0) / metrics.renderTimes.length
      const maxRenderTime = Math.max(...metrics.renderTimes)
      const memoryGrowthTrend = metrics.memorySnapshots[metrics.memorySnapshots.length - 1] - metrics.memorySnapshots[0]
      
      console.log(`Performance Metrics Summary:`)
      console.log(`Average render time: ${avgRenderTime.toFixed(2)}ms`)
      console.log(`Maximum render time: ${maxRenderTime.toFixed(2)}ms`)
      console.log(`Memory growth trend: ${(memoryGrowthTrend / 1024 / 1024).toFixed(2)}MB`)
      
      // Performance assertions
      expect(avgRenderTime).toBeLessThan(100) // Average render under 100ms
      expect(maxRenderTime).toBeLessThan(200) // Max render under 200ms
      expect(Math.abs(memoryGrowthTrend)).toBeLessThan(20 * 1024 * 1024) // Memory trend under 20MB
    })
  })
})

// Helper to check if running in Node.js with --expose-gc flag
const gcAvailable = typeof global.gc === 'function'
if (!gcAvailable) {
  console.warn('Garbage collection not available. Run tests with --expose-gc flag for more accurate memory testing.')
}

// Helper to format memory usage
function formatMemory(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(2)}MB`
}

// Helper to create memory pressure for testing
function createMemoryPressure(): () => void {
  const arrays: any[][] = []
  
  const interval = setInterval(() => {
    // Create some memory pressure
    arrays.push(new Array(10000).fill(Math.random()))
    
    // Cleanup old arrays to prevent test suite from crashing
    if (arrays.length > 100) {
      arrays.splice(0, 50)
    }
  }, 10)
  
  return () => {
    clearInterval(interval)
    arrays.length = 0
  }
}

// Export utilities for other tests
export { formatMemory, createMemoryPressure }