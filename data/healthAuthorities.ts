import type {
  CanadianJurisdiction,
  HealthAuthorityContact,
} from '../types/foiPayload';

/**
 * Standard provincial health authority / facility record-department templates.
 */
export const HEALTH_AUTHORITIES: HealthAuthorityContact[] = [
  {
    id: 'sk-sha',
    name: 'Saskatchewan Health Authority',
    jurisdiction: 'SK',
    departmentName: 'Health Information Management — Access to Information',
    addressLines: [
      'Saskatchewan Health Authority',
      'Access to Information Office',
      '2121 11th Avenue',
      'Regina, SK S4P 3X3',
    ],
    phone: '1-877-800-0002',
    fax: '306-766-5970',
    email: 'access.information@saskhealthauthority.ca',
  },
  {
    id: 'on-uhn',
    name: 'University Health Network (ON)',
    jurisdiction: 'ON',
    departmentName: 'Health Records / Privacy Office',
    addressLines: [
      'University Health Network',
      'Health Records Department',
      '190 Elizabeth Street',
      'Toronto, ON M5G 2C4',
    ],
    phone: '416-340-3131',
    fax: '416-340-4186',
    email: 'health.records@uhn.ca',
  },
  {
    id: 'on-oh',
    name: 'Ontario Health — Provincial Programs',
    jurisdiction: 'ON',
    departmentName: 'Privacy & Access to Information',
    addressLines: [
      'Ontario Health',
      'Privacy Office',
      '525 University Avenue, 5th Floor',
      'Toronto, ON M5G 2L3',
    ],
    phone: '1-877-660-6066',
    email: 'privacy@ontariohealth.ca',
  },
  {
    id: 'bc-fraser',
    name: 'Fraser Health (BC)',
    jurisdiction: 'BC',
    departmentName: 'Information Access & Privacy',
    addressLines: [
      'Fraser Health Authority',
      'Information Access & Privacy Office',
      'Suite 400, 13450 102 Avenue',
      'Surrey, BC V3T 0H1',
    ],
    phone: '604-587-4600',
    fax: '604-587-4666',
    email: 'foi@fraserhealth.ca',
  },
  {
    id: 'bc-vch',
    name: 'Vancouver Coastal Health (BC)',
    jurisdiction: 'BC',
    departmentName: 'Freedom of Information Office',
    addressLines: [
      'Vancouver Coastal Health',
      'FOI Office',
      '11th Floor, 601 West Broadway',
      'Vancouver, BC V5Z 4C2',
    ],
    phone: '604-875-4252',
    email: 'foi@vch.ca',
  },
  {
    id: 'ab-ahs',
    name: 'Alberta Health Services',
    jurisdiction: 'AB',
    departmentName: 'Health Information Management — Access & Disclosure',
    addressLines: [
      'Alberta Health Services',
      'Access & Disclosure',
      'Seventh Street Plaza, North Tower',
      '10030 107 Street NW',
      'Edmonton, AB T5J 3E4',
    ],
    phone: '1-855-442-3888',
    fax: '780-735-1152',
    email: 'access.disclosure@ahs.ca',
  },
];

export function facilitiesForJurisdiction(
  jurisdiction: CanadianJurisdiction,
): HealthAuthorityContact[] {
  return HEALTH_AUTHORITIES.filter((f) => f.jurisdiction === jurisdiction);
}

export function getFacilityById(id: string): HealthAuthorityContact | undefined {
  return HEALTH_AUTHORITIES.find((f) => f.id === id);
}
