import OptionSelect from "../ui/OptionSelect";

type RegionFiltersProps = {
  id: string;
  country: string;
  countries: string[];
  region: string;
  regions: string[];
  onCountryChange: (value: string) => void;
  onRegionChange: (value: string) => void;
};

// An empty value means "all"; the pickers use the "all" option id for it.
const all = (value: string) => value || "all";
const fromOption = (id: string) => (id === "all" ? "" : id);

export default function RegionFilters({
  id,
  country,
  countries,
  region,
  regions,
  onCountryChange,
  onRegionChange,
}: RegionFiltersProps) {
  return (
    <div id={id} className="grid gap-3 pt-3 sm:grid-cols-2">
      <OptionSelect
        className="w-full sm:max-w-64"
        label="Country"
        value={all(country)}
        options={[
          { id: "all", label: "All countries" },
          ...countries.map((value) => ({ id: value, label: value })),
        ]}
        onChange={(value) => onCountryChange(fromOption(value))}
      />
      <OptionSelect
        className="w-full sm:max-w-64"
        label="Region / state"
        value={all(region)}
        options={[
          { id: "all", label: "All regions" },
          ...regions.map((value) => ({ id: value, label: value })),
        ]}
        onChange={(value) => onRegionChange(fromOption(value))}
      />
    </div>
  );
}
