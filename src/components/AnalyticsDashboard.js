import { Component } from '../core/Component.js';
import { Analytics } from '../lib/Analytics.js';

/**
 * Analytics Dashboard Component
 * Displays insights, trends, and predictions
 */
export class AnalyticsDashboard extends Component {
  constructor(props) {
    super(props);
    this.analytics = new Analytics(window.store);
    this.state = {
      insights: null,
      loading: true,
    };
  }

  afterMount() {
    this.loadInsights();
    this.setupCharts();

    // Refresh insights when data changes
    window.addEventListener('store:data', () => this.loadInsights());
  }

  loadInsights() {
    setTimeout(() => {
      const insights = this.analytics.generateDashboardInsights();
      this.setState({ insights, loading: false });
    }, 300);
  }

  setupCharts() {
    // Wait for Chart.js to be available
    if (typeof Chart === 'undefined') {
      setTimeout(() => this.setupCharts(), 100);
      return;
    }

    this.renderCharts();
  }

  renderCharts() {
    const { insights } = this.state;
    if (!insights || !insights.walks) return;

    // Walk Streak Chart
    this.renderStreakChart();

    // Mood Distribution
    this.renderMoodChart();

    // Financial Trend
    if (insights.finances) {
      this.renderFinancialChart();
    }
  }

  renderStreakChart() {
    const canvas = document.getElementById('streakChart');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { insights } = this.state;

    new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Walks This Week',
          data: this.getWeeklyWalkData(),
          borderColor: '#7be3ff',
          backgroundColor: 'rgba(123, 227, 255, 0.1)',
          tension: 0.4,
          fill: true,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: '#95b0c8' },
            grid: { color: 'rgba(123, 227, 255, 0.1)' },
          },
          x: {
            ticks: { color: '#95b0c8' },
            grid: { display: false },
          },
        },
      },
    });
  }

  renderMoodChart() {
    const canvas = document.getElementById('moodChart');
    if (!canvas) return;

    const walks = window.store.get('fh.walks', []);
    const moodCounts = {};

    walks.forEach(w => {
      moodCounts[w.mood] = (moodCounts[w.mood] || 0) + 1;
    });

    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: Object.keys(moodCounts),
        datasets: [{
          data: Object.values(moodCounts),
          backgroundColor: [
            '#7be3ff',
            '#6cf3b1',
            '#ffb84a',
            '#ff6b8a',
          ],
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#95b0c8' },
          },
        },
      },
    });
  }

  renderFinancialChart() {
    const canvas = document.getElementById('financialChart');
    if (!canvas) return;

    const timeline = window.store.get('house.timeline', []).slice(0, 12).reverse();

    const ctx = canvas.getContext('2d');

    new Chart(ctx, {
      type: 'bar',
      data: {
        labels: timeline.map(t => new Date(t.when).toLocaleDateString('en-US', { month: 'short' })),
        datasets: [{
          label: 'Balance',
          data: timeline.map(t => t.total),
          backgroundColor: 'rgba(108, 243, 177, 0.6)',
          borderColor: '#6cf3b1',
          borderWidth: 2,
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
        },
        scales: {
          y: {
            ticks: {
              color: '#95b0c8',
              callback: (value) => '$' + value.toLocaleString(),
            },
            grid: { color: 'rgba(123, 227, 255, 0.1)' },
          },
          x: {
            ticks: { color: '#95b0c8' },
            grid: { display: false },
          },
        },
      },
    });
  }

  getWeeklyWalkData() {
    const walks = window.store.get('fh.walks', []);
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const weekData = [0, 0, 0, 0, 0, 0, 0];

    walks.forEach(walk => {
      const walkDate = new Date(walk.date);
      if (walkDate >= weekStart) {
        const dayIndex = walkDate.getDay();
        weekData[dayIndex]++;
      }
    });

    return weekData;
  }

  template() {
    const { insights, loading } = this.state;

    if (loading) {
      return `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Analytics Dashboard</h3>
          </div>
          <div style="text-align: center; padding: 40px;">
            <div class="spinner" style="margin: 0 auto;"></div>
            <p class="mt-md">Loading insights...</p>
          </div>
        </div>
      `;
    }

    if (!insights) {
      return `
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">📊 Analytics Dashboard</h3>
          </div>
          <p class="text-muted">No data yet. Start logging walks, work, and other activities to see insights!</p>
        </div>
      `;
    }

    const { walks, finances, productivity, summary } = insights;

    return `
      <div class="analytics-dashboard">
        ${summary && summary.length > 0 ? `
          <div class="card mb-lg fade-in">
            <div class="card-header">
              <h3 class="card-title">🎯 Smart Insights</h3>
            </div>
            <div class="insights-list">
              ${summary.map(insight => `
                <div class="insight-card ${insight.type} ${insight.urgent ? 'urgent' : ''}">
                  <div class="insight-icon">${this.getInsightIcon(insight.type)}</div>
                  <div class="insight-content">
                    <p>${insight.message}</p>
                    <span class="badge badge-${this.getInsightBadgeType(insight.type)}">
                      ${insight.confidence} confidence
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${walks ? `
          <div class="card mb-lg fade-in-up" style="animation-delay: 0.1s;">
            <div class="card-header">
              <h3 class="card-title">🚶 Walk Analytics</h3>
            </div>
            <div class="grid grid-3 mb-lg">
              <div class="stat-card">
                <div class="stat-value">${walks.currentStreak}</div>
                <div class="stat-label">Current Streak</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${walks.longestStreak}</div>
                <div class="stat-label">Longest Streak</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${walks.averagePerWeek}</div>
                <div class="stat-label">Avg/Week</div>
              </div>
            </div>

            <div class="grid grid-2 mb-lg">
              <div class="chart-container">
                <h4 class="mb-md">Weekly Activity</h4>
                <canvas id="streakChart" height="200"></canvas>
              </div>
              <div class="chart-container">
                <h4 class="mb-md">Mood Distribution</h4>
                <canvas id="moodChart" height="200"></canvas>
              </div>
            </div>

            ${walks.predictions && walks.predictions.length > 0 ? `
              <div class="predictions">
                <h4 class="mb-md">Predictions & Patterns</h4>
                ${walks.predictions.map(pred => `
                  <div class="prediction-item">
                    <span class="prediction-icon">${pred.type === 'achievement' ? '🏆' : pred.type === 'pattern' ? '📈' : '⏰'}</span>
                    <span>${pred.message}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="info-grid mt-lg">
              <div class="info-item">
                <span class="info-label">Most Common Time</span>
                <span class="info-value">${walks.mostCommonTime || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Favorite Mood</span>
                <span class="info-value">${walks.mostCommonMood || 'N/A'}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Favorite Location</span>
                <span class="info-value">${walks.favoriteLocation || 'N/A'}</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${finances ? `
          <div class="card mb-lg fade-in-up" style="animation-delay: 0.2s;">
            <div class="card-header">
              <h3 class="card-title">💰 Financial Insights</h3>
            </div>
            <div class="grid grid-3 mb-lg">
              <div class="stat-card">
                <div class="stat-value">$${finances.currentBalance.toLocaleString()}</div>
                <div class="stat-label">Current Balance</div>
              </div>
              <div class="stat-card">
                <div class="stat-value ${finances.trend === 'increasing' ? 'text-success' : finances.trend === 'decreasing' ? 'text-warning' : ''}">
                  ${finances.trend === 'increasing' ? '↗' : finances.trend === 'decreasing' ? '↘' : '→'}
                  ${finances.trend}
                </div>
                <div class="stat-label">Trend</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${finances.runwayMonths === Infinity ? '∞' : finances.runwayMonths.toFixed(1)}</div>
                <div class="stat-label">Runway (months)</div>
              </div>
            </div>

            <div class="chart-container mb-lg">
              <h4 class="mb-md">Balance History</h4>
              <canvas id="financialChart" height="200"></canvas>
            </div>

            ${finances.anomalies && finances.anomalies.length > 0 ? `
              <div class="anomalies">
                <h4 class="mb-md">Unusual Transactions</h4>
                ${finances.anomalies.map(anom => `
                  <div class="anomaly-item ${anom.type}">
                    <span>${anom.type === 'spike' ? '⬆️' : '⬇️'}</span>
                    <span>${new Date(anom.date).toLocaleDateString()}: ${anom.type} of $${Math.abs(anom.amount).toLocaleString()}</span>
                  </div>
                `).join('')}
              </div>
            ` : ''}
          </div>
        ` : ''}

        ${productivity ? `
          <div class="card fade-in-up" style="animation-delay: 0.3s;">
            <div class="card-header">
              <h3 class="card-title">⚡ Productivity Insights</h3>
            </div>
            <div class="grid grid-3 mb-lg">
              <div class="stat-card">
                <div class="stat-value">${productivity.completionRate}%</div>
                <div class="stat-label">Completion Rate</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${productivity.streakDays}</div>
                <div class="stat-label">Active Days</div>
              </div>
              <div class="stat-card">
                <div class="stat-value">${productivity.completedTasks}/${productivity.totalTasks}</div>
                <div class="stat-label">Tasks Done</div>
              </div>
            </div>

            ${productivity.productiveHours && productivity.productiveHours.length > 0 ? `
              <div class="info-grid">
                <div class="info-item">
                  <span class="info-label">Most Productive Hours</span>
                  <span class="info-value">${productivity.productiveHours.join(', ')}</span>
                </div>
              </div>
            ` : ''}
          </div>
        ` : ''}

        <style>
          .analytics-dashboard .insights-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .insight-card {
            display: flex;
            gap: 16px;
            padding: 16px;
            background: rgba(40, 50, 70, 0.3);
            border-radius: 12px;
            border-left: 4px solid var(--accent-primary);
          }

          .insight-card.warning {
            border-left-color: var(--accent-warning);
          }

          .insight-card.urgent {
            border-left-color: var(--accent-error);
            animation: pulse 2s infinite;
          }

          .insight-icon {
            font-size: 24px;
          }

          .insight-content {
            flex: 1;
          }

          .insight-content p {
            margin: 0 0 8px;
          }

          .stat-card {
            text-align: center;
            padding: 20px;
            background: rgba(40, 50, 70, 0.3);
            border-radius: 12px;
          }

          .stat-value {
            font-size: 2.5rem;
            font-weight: 700;
            color: var(--accent-primary);
            font-family: 'Rajdhani', sans-serif;
          }

          .stat-label {
            color: var(--text-secondary);
            font-size: 0.875rem;
            margin-top: 8px;
          }

          .chart-container {
            position: relative;
          }

          .predictions,
          .anomalies {
            padding: 16px;
            background: rgba(40, 50, 70, 0.2);
            border-radius: 12px;
          }

          .prediction-item,
          .anomaly-item {
            padding: 8px 0;
            display: flex;
            align-items: center;
            gap: 12px;
          }

          .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
          }

          .info-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }

          .info-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.1em;
            color: var(--text-muted);
          }

          .info-value {
            font-size: 1.125rem;
            font-weight: 600;
            color: var(--text-primary);
          }

          .text-success {
            color: var(--accent-success);
          }

          .text-warning {
            color: var(--accent-warning);
          }
        </style>
      </div>
    `;
  }

  getInsightIcon(type) {
    const icons = {
      achievement: '🎉',
      milestone: '🏁',
      pattern: '📈',
      reminder: '⏰',
      warning: '⚠️',
      suggestion: '💡',
    };
    return icons[type] || '📊';
  }

  getInsightBadgeType(type) {
    const badges = {
      achievement: 'success',
      milestone: 'primary',
      pattern: 'primary',
      reminder: 'warning',
      warning: 'warning',
      suggestion: 'primary',
    };
    return badges[type] || 'primary';
  }
}
