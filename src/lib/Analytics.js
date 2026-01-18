/**
 * Analytics and insights engine
 * Provides smart pattern detection and anticipatory suggestions
 */
export class Analytics {
  constructor(store) {
    this.store = store;
  }

  /**
   * Analyze walk patterns and provide insights
   */
  analyzeWalkPatterns() {
    const walks = this.store.get('fh.walks', []);
    if (walks.length < 3) return null;

    const insights = {
      totalWalks: walks.length,
      currentStreak: this.calculateStreak(walks),
      longestStreak: this.calculateLongestStreak(walks),
      averagePerWeek: this.calculateAveragePerWeek(walks),
      mostCommonTime: this.getMostCommonTime(walks),
      mostCommonWeather: this.getMostCommon(walks, 'weather'),
      mostCommonMood: this.getMostCommon(walks, 'mood'),
      favoriteLocation: this.getMostCommon(walks, 'location'),
      moonPhaseCorrelation: this.analyzeMoonPhaseCorrelation(walks),
      predictions: this.generatePredictions(walks),
    };

    return insights;
  }

  /**
   * Calculate current streak
   */
  calculateStreak(walks) {
    const days = new Set(walks.map(w => w.date.slice(0, 10)));
    let streak = 0;
    let d = new Date();

    while (days.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    return streak;
  }

  /**
   * Calculate longest streak ever
   */
  calculateLongestStreak(walks) {
    const sortedDates = walks
      .map(w => w.date.slice(0, 10))
      .sort()
      .filter((date, i, arr) => i === 0 || date !== arr[i - 1]);

    let maxStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < sortedDates.length; i++) {
      const prev = new Date(sortedDates[i - 1]);
      const curr = new Date(sortedDates[i]);
      const diffDays = Math.floor((curr - prev) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        maxStreak = Math.max(maxStreak, currentStreak);
        currentStreak = 1;
      }
    }

    return Math.max(maxStreak, currentStreak);
  }

  /**
   * Calculate average walks per week
   */
  calculateAveragePerWeek(walks) {
    if (walks.length === 0) return 0;
    const firstWalk = new Date(walks[walks.length - 1].date);
    const lastWalk = new Date(walks[0].date);
    const weeks = Math.max(1, (lastWalk - firstWalk) / (1000 * 60 * 60 * 24 * 7));
    return (walks.length / weeks).toFixed(1);
  }

  /**
   * Find most common time of day for walks
   */
  getMostCommonTime(walks) {
    const hours = walks.map(w => new Date(w.date).getHours());
    const timeRanges = hours.map(h => {
      if (h >= 5 && h < 8) return 'Early Morning (5-8am)';
      if (h >= 8 && h < 12) return 'Morning (8am-12pm)';
      if (h >= 12 && h < 17) return 'Afternoon (12-5pm)';
      if (h >= 17 && h < 21) return 'Evening (5-9pm)';
      return 'Night (9pm-5am)';
    });

    return this.getMostFrequent(timeRanges);
  }

  /**
   * Get most common value for a field
   */
  getMostCommon(items, field) {
    const values = items.map(item => item[field]).filter(Boolean);
    return this.getMostFrequent(values);
  }

  /**
   * Get most frequent item from array
   */
  getMostFrequent(arr) {
    if (arr.length === 0) return null;
    const counts = {};
    arr.forEach(val => counts[val] = (counts[val] || 0) + 1);
    return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
  }

  /**
   * Analyze correlation between moon phases and mood/weather
   */
  analyzeMoonPhaseCorrelation(walks) {
    const phaseToMood = {};

    walks.forEach(walk => {
      const phase = walk.moonPhase || 'Unknown';
      if (!phaseToMood[phase]) {
        phaseToMood[phase] = { moods: [], weathers: [], count: 0 };
      }
      phaseToMood[phase].moods.push(walk.mood);
      phaseToMood[phase].weathers.push(walk.weather);
      phaseToMood[phase].count++;
    });

    return Object.entries(phaseToMood).map(([phase, data]) => ({
      phase,
      count: data.count,
      commonMood: this.getMostFrequent(data.moods),
      commonWeather: this.getMostFrequent(data.weathers),
    }));
  }

  /**
   * Generate predictive insights
   */
  generatePredictions(walks) {
    const predictions = [];
    const currentStreak = this.calculateStreak(walks);
    const longestStreak = this.calculateLongestStreak(walks);

    // Streak predictions
    if (currentStreak > 0) {
      if (currentStreak === longestStreak) {
        predictions.push({
          type: 'achievement',
          message: `🎉 You're on your longest streak ever! Keep it going!`,
          confidence: 'high',
        });
      } else if (currentStreak + 1 === longestStreak) {
        predictions.push({
          type: 'milestone',
          message: `One more day to tie your record streak of ${longestStreak} days!`,
          confidence: 'high',
        });
      }
    }

    // Time pattern prediction
    const recentWalks = walks.slice(0, 7);
    if (recentWalks.length >= 3) {
      const avgHour = recentWalks.reduce((sum, w) =>
        sum + new Date(w.date).getHours(), 0) / recentWalks.length;
      const timeStr = this.formatHour(Math.round(avgHour));
      predictions.push({
        type: 'pattern',
        message: `You typically walk around ${timeStr}. Perfect timing!`,
        confidence: 'medium',
      });
    }

    // Missed walk detection
    const today = new Date().toISOString().slice(0, 10);
    const hasWalkedToday = walks.some(w => w.date.slice(0, 10) === today);
    const currentHour = new Date().getHours();

    if (!hasWalkedToday && currentHour >= 12 && currentStreak > 2) {
      predictions.push({
        type: 'reminder',
        message: `Haven't logged a walk yet today. Don't break your ${currentStreak}-day streak!`,
        confidence: 'high',
        urgent: true,
      });
    }

    return predictions;
  }

  /**
   * Format hour to readable time
   */
  formatHour(hour) {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${period}`;
  }

  /**
   * Analyze household financial patterns
   */
  analyzeFinancials() {
    const timeline = this.store.get('house.timeline', []);
    if (timeline.length < 2) return null;

    const sorted = [...timeline].sort((a, b) =>
      new Date(a.when) - new Date(b.when));

    const insights = {
      currentBalance: timeline[0]?.total || 0,
      trend: this.calculateTrend(sorted),
      burnRate: this.calculateBurnRate(sorted),
      runwayMonths: this.calculateRunway(sorted),
      savingsRate: this.calculateSavingsRate(sorted),
      anomalies: this.detectAnomalies(sorted),
    };

    return insights;
  }

  /**
   * Calculate financial trend
   */
  calculateTrend(timeline) {
    if (timeline.length < 2) return 'stable';

    const recent = timeline.slice(-5);
    const totals = recent.map(t => t.total);
    const increasing = totals.every((val, i, arr) =>
      i === 0 || val >= arr[i - 1]);
    const decreasing = totals.every((val, i, arr) =>
      i === 0 || val <= arr[i - 1]);

    if (increasing) return 'increasing';
    if (decreasing) return 'decreasing';
    return 'volatile';
  }

  /**
   * Calculate monthly burn rate
   */
  calculateBurnRate(timeline) {
    if (timeline.length < 2) return 0;

    const first = timeline[0];
    const last = timeline[timeline.length - 1];
    const months = Math.max(1,
      (new Date(last.when) - new Date(first.when)) / (1000 * 60 * 60 * 24 * 30));
    const change = first.total - last.total;

    return change / months;
  }

  /**
   * Calculate runway in months
   */
  calculateRunway(timeline) {
    if (timeline.length === 0) return 0;

    const burnRate = this.calculateBurnRate(timeline);
    if (burnRate <= 0) return Infinity;

    const current = timeline[timeline.length - 1].total;
    return current / burnRate;
  }

  /**
   * Calculate savings rate
   */
  calculateSavingsRate(timeline) {
    if (timeline.length < 2) return 0;

    const recent = timeline.slice(-3);
    let totalIncome = 0;
    let totalSaved = 0;

    for (let i = 1; i < recent.length; i++) {
      const change = recent[i].total - recent[i - 1].total;
      if (change > 0) {
        totalIncome += change;
        totalSaved += change;
      }
    }

    return totalIncome > 0 ? (totalSaved / totalIncome) * 100 : 0;
  }

  /**
   * Detect financial anomalies
   */
  detectAnomalies(timeline) {
    if (timeline.length < 5) return [];

    const changes = [];
    for (let i = 1; i < timeline.length; i++) {
      changes.push(Math.abs(timeline[i].total - timeline[i - 1].total));
    }

    const avg = changes.reduce((a, b) => a + b, 0) / changes.length;
    const stdDev = Math.sqrt(
      changes.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / changes.length
    );

    const anomalies = [];
    for (let i = 1; i < timeline.length; i++) {
      const change = Math.abs(timeline[i].total - timeline[i - 1].total);
      if (change > avg + (2 * stdDev)) {
        anomalies.push({
          date: timeline[i].when,
          amount: timeline[i].total - timeline[i - 1].total,
          type: timeline[i].total > timeline[i - 1].total ? 'spike' : 'drop',
        });
      }
    }

    return anomalies;
  }

  /**
   * Analyze work/study patterns
   */
  analyzeProductivity() {
    const schedule = this.store.get('fh.schedule', []);
    const progress = this.store.get('fh.progress', []);

    const insights = {
      totalTasks: schedule.length,
      completedTasks: progress.filter(p => p.text.includes('Completed')).length,
      completionRate: 0,
      productiveHours: this.getProductiveHours(progress),
      streakDays: this.getProductivityStreak(progress),
    };

    insights.completionRate = insights.totalTasks > 0
      ? (insights.completedTasks / insights.totalTasks * 100).toFixed(1)
      : 0;

    return insights;
  }

  /**
   * Get most productive hours
   */
  getProductiveHours(progress) {
    const hours = progress
      .filter(p => p.date)
      .map(p => new Date(p.date).getHours());

    const counts = {};
    hours.forEach(h => counts[h] = (counts[h] || 0) + 1);

    const sorted = Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => this.formatHour(parseInt(hour)));

    return sorted;
  }

  /**
   * Calculate productivity streak
   */
  getProductivityStreak(progress) {
    const days = new Set(
      progress
        .filter(p => p.date)
        .map(p => new Date(p.date).toISOString().slice(0, 10))
    );

    let streak = 0;
    let d = new Date();

    while (days.has(d.toISOString().slice(0, 10))) {
      streak++;
      d.setDate(d.getDate() - 1);
    }

    return streak;
  }

  /**
   * Generate comprehensive dashboard insights
   */
  generateDashboardInsights() {
    const walkInsights = this.analyzeWalkPatterns();
    const financialInsights = this.analyzeFinancials();
    const productivityInsights = this.analyzeProductivity();

    return {
      walks: walkInsights,
      finances: financialInsights,
      productivity: productivityInsights,
      summary: this.generateSummary(walkInsights, financialInsights, productivityInsights),
    };
  }

  /**
   * Generate summary insights
   */
  generateSummary(walks, finances, productivity) {
    const summary = [];

    if (walks?.predictions) {
      walks.predictions.forEach(pred => {
        if (pred.urgent) summary.push(pred);
      });
    }

    if (finances?.trend === 'decreasing' && finances.runwayMonths < 6) {
      summary.push({
        type: 'warning',
        message: `Financial runway: ${finances.runwayMonths.toFixed(1)} months. Consider reviewing expenses.`,
        confidence: 'high',
      });
    }

    if (productivity?.completionRate < 50 && productivity.totalTasks > 5) {
      summary.push({
        type: 'suggestion',
        message: `Task completion rate is ${productivity.completionRate}%. Try breaking tasks into smaller steps.`,
        confidence: 'medium',
      });
    }

    return summary;
  }
}
