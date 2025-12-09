import React from "react";
import { PlanSummary } from "types/app";

interface Props {
  availablePlans: PlanSummary[];
  selectedPlan: PlanSummary;
  planChangeHandler: (p: PlanSummary) => void;
}

const PlanPicker = ({
  availablePlans,
  selectedPlan,
  planChangeHandler,
}: Props) => {
  const getDistance = (type: string): number => {
    switch (type) {
      case "Base": return 0;
      case "5K": return 5;
      case "10K": return 10;
      case "15K/10M": return 15;
      case "Half Marathon": return 21.1;
      case "Marathon": return 42.2;
      case "Multiple Distances": return 50;
      default: return 100;
    }
  };

  const getMileage = (name: string): number => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes('more than 85')) return 100;
    if (lowerName.includes('up to 55')) return 55;
    const match = name.match(/(\d+)\s*(?:to\s*(\d+))?\s*miles?/i);
    if (match) {
      return parseInt(match[2] || match[1]);
    }
    // For plans without mileage, assign based on keywords
    if (lowerName.includes('novice') || lowerName.includes('beginner') || lowerName.includes('couch')) {
      return 10; // Low mileage
    }
    if (lowerName.includes('intermediate')) {
      return 30;
    }
    if (lowerName.includes('advanced')) {
      return 50;
    }
    return 20; // Default
  };

  const handleChange = (event: React.ChangeEvent<{ value: unknown }>) => {
    const newSelection = availablePlans.find(
      (p) => p.id === (event.target.value as string),
    );
    if (newSelection) {
      planChangeHandler(newSelection);
    } else {
      throw new Error("Invalid selection: " + event.target.value);
    }
  };

  const categories = [
    { label: "5K/10K Plans", types: ["5K", "10K", "15K/10M", "Base", "Multiple Distances"] },
    { label: "Half Marathon Plans", types: ["Half Marathon"] },
    { label: "Marathon Plans", types: ["Marathon"] }
  ];

  const renderSelect = (category: { label: string; types: string[] }) => {
    const categoryPlans = availablePlans.filter(p => category.types.includes(p.type));
    const groupedPlans = categoryPlans.reduce((groups, plan) => {
      const groupKey = plan.subcategory ? `${plan.coach} - ${plan.subcategory}` : plan.coach;
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(plan);
      return groups;
    }, {} as Record<string, PlanSummary[]>);

    const planOptions = Object.keys(groupedPlans)
      .sort((a, b) => {
        const minDistA = Math.min(...groupedPlans[a].map(p => getDistance(p.type)));
        const minDistB = Math.min(...groupedPlans[b].map(p => getDistance(p.type)));
        return minDistA - minDistB;
      })
      .map(group => (
        <optgroup key={group} label={group}>
          {groupedPlans[group].sort((a, b) => {
            const mileageA = getMileage(a.name);
            const mileageB = getMileage(b.name);
            if (mileageA !== mileageB) return mileageA - mileageB;
            const distA = getDistance(a.type);
            const distB = getDistance(b.type);
            if (distA !== distB) return distA - distB;
            return a.name.localeCompare(b.name);
          }).map(plan => (
            <option key={plan.id} value={plan.id}>
              ({plan.type}) {plan.name}
            </option>
          ))}
        </optgroup>
      ));

    return (
      <div key={category.label} style={{ marginBottom: '1rem' }}>
        <label>{category.label}</label>
        <select
          className="select"
          value={categoryPlans.some(p => p.id === selectedPlan.id) ? selectedPlan.id : ""}
          onChange={handleChange}
        >
          <option value="">Select a plan</option>
          {planOptions}
        </select>
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
      {categories.map(category => {
        const categoryPlans = availablePlans.filter(p => category.types.includes(p.type));
        const groupedPlans = categoryPlans.reduce((groups, plan) => {
          const groupKey = plan.subcategory ? `${plan.coach} - ${plan.subcategory}` : plan.coach;
          if (!groups[groupKey]) groups[groupKey] = [];
          groups[groupKey].push(plan);
          return groups;
        }, {} as Record<string, PlanSummary[]>);

        const planOptions = Object.keys(groupedPlans)
          .sort((a, b) => {
            const minDistA = Math.min(...groupedPlans[a].map(p => getDistance(p.type)));
            const minDistB = Math.min(...groupedPlans[b].map(p => getDistance(p.type)));
            return minDistA - minDistB;
          })
          .map(group => (
            <optgroup key={group} label={group}>
              {groupedPlans[group].sort((a, b) => {
                const mileageA = getMileage(a.name);
                const mileageB = getMileage(b.name);
                if (mileageA !== mileageB) return mileageA - mileageB;
                const distA = getDistance(a.type);
                const distB = getDistance(b.type);
                if (distA !== distB) return distA - distB;
                return a.name.localeCompare(b.name);
              }).map(plan => (
                <option key={plan.id} value={plan.id}>
                  ({plan.type}) {plan.name}
                </option>
              ))}
            </optgroup>
          ));

        return (
          <select
            key={category.label}
            className="select"
            style={{ flex: '1', minWidth: '120px' }}
            value={categoryPlans.some(p => p.id === selectedPlan.id) ? selectedPlan.id : ""}
            onChange={handleChange}
          >
            <option value="">{category.label}</option>
            {planOptions}
          </select>
        );
      })}
    </div>
  );
};

export default PlanPicker;
