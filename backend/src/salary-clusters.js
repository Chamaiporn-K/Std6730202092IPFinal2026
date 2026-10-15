// Deterministic 1D Lloyd K-Means. Return the mean of actual members in each tier.
function clusterSalaries(salaries) {
  if (!salaries.every(value => typeof value === 'number' && Number.isFinite(value) && value >= 0)) throw new Error('Invalid salary data');
  const values = [...salaries].sort((a, b) => a - b);
  const unique = [...new Set(values)];
  const k = Math.min(3, unique.length);
  let centers = Array.from({length: k}, (_, i) => unique[k === 1 ? 0 : Math.round(i * (unique.length - 1) / (k - 1))]);
  let groups = [], previous = [];
  for (let iteration = 0; k && iteration < 100; iteration++) {
    const labels = values.map(value => {
      let nearest = 0;
      for (let i = 1; i < k; i++) if (Math.abs(value - centers[i]) < Math.abs(value - centers[nearest])) nearest = i;
      return nearest;
    });
    const counts = Array.from({length: k}, (_, i) => labels.filter(label => label === i).length);
    for (let empty = 0; empty < k; empty++) {
      if (counts[empty]) continue;
      let donor = -1, distance = -1;
      values.forEach((value, index) => {
        const gap = Math.abs(value - centers[labels[index]]);
        if (counts[labels[index]] > 1 && gap > distance) { donor = index; distance = gap; }
      });
      if (donor >= 0) { counts[labels[donor]]--; labels[donor] = empty; counts[empty]++; }
    }
    groups = Array.from({length: k}, () => []);
    values.forEach((value, index) => groups[labels[index]].push(value));
    centers = groups.map(group => group.reduce((sum, value) => sum + value, 0) / group.length);
    if (labels.every((label, index) => label === previous[index])) break;
    previous = labels;
  }
  const clusters = groups.map(group => ({centroid: Number((group.reduce((sum, value) => sum + value, 0) / group.length).toFixed(2)), count: group.length})).sort((a, b) => a.centroid - b.centroid);
  while (clusters.length < 3) clusters.push({centroid: null, count: 0});
  return clusters.map((cluster, index) => ({group: `Tier ${index + 1}`, ...cluster}));
}
module.exports = {clusterSalaries};
