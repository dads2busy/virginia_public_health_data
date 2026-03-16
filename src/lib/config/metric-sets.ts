/**
 * Metric set button definitions.
 * Each button sets the selected_variable when clicked.
 * Matches the button layout from site.R lines 144-421.
 */

export interface MetricButton {
  label: string
  variable: string
}

export interface MetricSection {
  heading: string
  buttons: MetricButton[]
}

export const ruralHealthSections: MetricSection[] = [
  {
    heading: 'Education',
    buttons: [{ label: 'Child Readiness', variable: 'mean_read_pass_rate' }],
  },
  {
    heading: 'Broadband',
    buttons: [{ label: 'Households with Broadband', variable: 'perc_hh_with_broadband_geo20' }],
  },
  {
    heading: 'Nutrition and Food Security',
    buttons: [
      { label: 'Food Insecurity', variable: 'percent_food_insecure' },
      { label: 'Childhood Food Insecurity', variable: 'Child_Food_Insecurity_Rate' },
    ],
  },
  {
    heading: 'Healthy Moms And Babies',
    buttons: [
      { label: 'APNCU: Inadequate', variable: 'inadequate_pc' },
      { label: 'APNCU: Intermediate', variable: 'intermediate_pc' },
      { label: 'APNCU: Adequate', variable: 'adequate_pc' },
      { label: 'APNCU: Adequate Plus', variable: 'adequateplus_pc' },
    ],
  },
  {
    heading: 'Access to Health Care Services',
    buttons: [{ label: 'Avoidable Hospitalizations', variable: 'prevent_hosp_rate' }],
  },
  {
    heading: 'Behavioral Health, Substance Use Disorder and Recovery',
    buttons: [{ label: 'Overdose ED Visits', variable: 'avg_monthly_rate' }],
  },
  {
    heading: 'Employment/Workforce Development',
    buttons: [
      { label: 'Earnings per Job', variable: 'earnings_per_job' },
      { label: 'Employment Rate', variable: 'emp_rate_geo20' },
    ],
  },
]

export const hoiSections: MetricSection[] = [
  {
    heading: '',
    buttons: [{ label: 'Health Opportunity Index', variable: 'health_opportunity_index_geo20' }],
  },
  {
    heading: 'HOI Component Indexes',
    buttons: [
      { label: 'Economic Opportunity', variable: 'economic_opportunity_profile_geo20' },
      { label: 'Built Environment', variable: 'built_environment_profile_geo20' },
      { label: 'Consumer Opportunity', variable: 'consumer_opportunity_profile_geo20' },
      { label: 'Social Impact', variable: 'social_impact_profile_geo20' },
    ],
  },
  {
    heading: 'Related Measures',
    buttons: [
      { label: 'Labor Force Participation Rate', variable: 'labor_participate_rate_geo20' },
      { label: 'Employment Access', variable: 'employment_access_index_geo20' },
      { label: 'Income Inequality', variable: 'gini_index_geo20' },
      { label: 'Material Deprivation', variable: 'material_deprivation_indicator_geo20' },
      { label: 'Years of Schooling', variable: 'average_years_schooling_geo20' },
      { label: 'Access to Food (VDH)', variable: 'food_access_percentage_geo20' },
      { label: 'Geographic Mobility', variable: 'perc_moving_geo20' },
      { label: 'Population Density', variable: 'population_density_geo20' },
      { label: 'Segregation', variable: 'segregation_indicator_geo20' },
      { label: 'Walkability', variable: 'walkability_index_geo20' },
      { label: 'Affordability (H&T)', variable: 'affordability_index_geo20' },
      { label: 'Environmental Hazard Index', variable: 'environmental_hazard_index_geo20' },
      { label: 'Care Access (VDH)', variable: 'access_care_indicator_geo20' },
      { label: 'Incarceration Rate (PPI)', variable: 'incarceration_rate_per_100000_geo20' },
    ],
  },
]

export const unitProfilesSections: MetricSection[] = [
  {
    heading: 'Demographic Summary',
    buttons: [
      { label: 'Population under 20', variable: 'age_under_20_percent_geo20' },
      { label: 'Population between 20 and 64', variable: 'age_20_64_percent_geo20' },
      { label: 'Population over 65', variable: 'age_65_plus_percent_geo20' },
      { label: 'Male Population', variable: 'gender_male_percent_geo20' },
      { label: 'Female Population', variable: 'gender_female_percent_geo20' },
      { label: 'White Population', variable: 'race_wht_alone_percent_geo20' },
      { label: 'Black or African American Population', variable: 'race_afr_amer_alone_percent_geo20' },
      { label: 'American Indian Population', variable: 'race_native_alone_percent_geo20' },
      { label: 'Asian/Pacific Islander Population', variable: 'race_AAPI_percent_geo20' },
      { label: 'Other Race Population', variable: 'race_other_percent_geo20' },
      { label: 'Two or More Races Population', variable: 'race_two_or_more_percent_geo20' },
      { label: 'Hispanic Population', variable: 'race_hispanic_or_latino_percent_geo20' },
      { label: 'Median Household Income', variable: 'median_household_income_geo20' },
      { label: 'Children Raised by Grandparents', variable: 'perc_children_raised_by_GPs_geo20' },
      { label: 'Without vehicle', variable: 'perc_no_vehicle_geo20' },
    ],
  },
  {
    heading: 'Agriculture Summary',
    buttons: [
      { label: 'Cropland Acreage', variable: 'total_cropland_acres' },
      { label: 'Irrigated Cropland Acreage', variable: 'total_irrigatedCropland_acre' },
      { label: 'Number of Cropland Operations', variable: 'total_cropland_operations' },
      { label: 'Expenses towards Animal Industry', variable: 'total_animal_expense' },
      { label: 'Sales of Fruits and Treenuts', variable: 'fruit_treeNut_total_sales' },
      { label: 'Sales of Animal Products', variable: 'total_animalProducts_sales' },
      { label: 'Sales of Commodities', variable: 'total_commodity_sales' },
      { label: 'Sales of Calves', variable: 'total_calves_sales' },
    ],
  },
  {
    heading: 'Health Summary',
    buttons: [
      { label: 'Poor physical health days', variable: 'perc_poor_phys_hlth_days_14_and_over' },
      { label: 'Poor mental health days', variable: 'perc_poor_ment_hlth_days_14_and_over' },
      { label: 'Uninsured', variable: 'no_hlth_ins_pct_geo20' },
      { label: 'Primary care physicians', variable: 'primcare_cnt' },
    ],
  },
  {
    heading: 'Education Summary',
    buttons: [{ label: 'Postsecondary education', variable: 'acs_postsecondary_percent_geo20' }],
  },
  {
    heading: 'Business and Employment Summary',
    buttons: [],
  },
]
