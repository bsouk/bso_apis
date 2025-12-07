/**
 * Script to create 5 jobs with different statuses for a logged-in user
 * Usage: node scripts/createJobsForUser.js <user_email>
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/user');
const Job = require('../src/models/jobs');

const USER_EMAIL = process.argv[2] || 'ghufranjaleel@yopmail.com';

// Job statuses: 'active', 'inactive', 'expired'
const JOB_STATUSES = ['active', 'inactive', 'expired'];

// Sample job data templates
const jobTemplates = [
  {
    job_title: 'Senior Software Engineer',
    job_type: ['Full-Time', 'Hybrid'],
    job_location_type: 'Remote',
    job_description: 'We are looking for an experienced Senior Software Engineer to join our dynamic team. You will be responsible for designing, developing, and maintaining high-quality software solutions.',
    responsibility: 'Design and develop scalable software solutions, Lead code reviews, Mentor junior developers, Collaborate with cross-functional teams',
    experience: 5,
    experience_type: 'experienced',
    skills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'AWS'],
    salary: '$80,000 - $120,000',
    rate: 'Annually',
    vacancy: '2',
    location: 'New York, NY',
    qualifications: 'Bachelor\'s degree in Computer Science or related field, 5+ years of experience',
    applications_instructions: 'Please submit your resume and cover letter through our portal.',
    status: 'active'
  },
  {
    job_title: 'Product Manager',
    job_type: ['Full-Time'],
    job_location_type: 'On-Site',
    job_description: 'Join our product team as a Product Manager. You will drive product strategy, work with engineering teams, and ensure successful product launches.',
    responsibility: 'Define product roadmap, Gather and prioritize requirements, Work with engineering and design teams, Analyze market trends',
    experience: 4,
    experience_type: 'experienced',
    skills: ['Product Management', 'Agile', 'Analytics', 'Communication', 'Strategy'],
    salary: '$90,000 - $130,000',
    rate: 'Annually',
    vacancy: '1',
    location: 'San Francisco, CA',
    qualifications: 'MBA or Bachelor\'s degree, 4+ years of product management experience',
    applications_instructions: 'Submit your application with portfolio examples.',
    status: 'inactive'
  },
  {
    job_title: 'UX Designer',
    job_type: ['Full-Time', 'Contract-Based'],
    job_location_type: 'Remote',
    job_description: 'We are seeking a talented UX Designer to create intuitive and engaging user experiences for our digital products.',
    responsibility: 'Create user personas and journey maps, Design wireframes and prototypes, Conduct user research, Collaborate with developers',
    experience: 3,
    experience_type: 'experienced',
    skills: ['Figma', 'Sketch', 'User Research', 'Prototyping', 'UI/UX Design'],
    salary: '$70,000 - $100,000',
    rate: 'Annually',
    vacancy: '1',
    location: 'Los Angeles, CA',
    qualifications: 'Portfolio demonstrating UX design skills, 3+ years of experience',
    applications_instructions: 'Please include your portfolio link in the application.',
    status: 'active'
  },
  {
    job_title: 'Data Analyst',
    job_type: ['Full-Time'],
    job_location_type: 'On-Site',
    job_description: 'Looking for a Data Analyst to help us make data-driven decisions. You will analyze large datasets and create insightful reports.',
    responsibility: 'Analyze complex datasets, Create data visualizations, Generate reports and insights, Work with stakeholders',
    experience: 2,
    experience_type: 'experienced',
    skills: ['SQL', 'Python', 'Tableau', 'Excel', 'Data Analysis'],
    salary: '$60,000 - $85,000',
    rate: 'Annually',
    vacancy: '2',
    location: 'Chicago, IL',
    qualifications: 'Bachelor\'s degree in Statistics, Mathematics, or related field',
    applications_instructions: 'Submit resume with examples of data analysis projects.',
    status: 'expired'
  },
  {
    job_title: 'Marketing Specialist',
    job_type: ['Part-Time', 'Freelance'],
    job_location_type: 'Remote',
    job_description: 'Join our marketing team as a Marketing Specialist. You will develop and execute marketing campaigns across various channels.',
    responsibility: 'Develop marketing strategies, Create content for social media, Manage email campaigns, Analyze campaign performance',
    experience: 2,
    experience_type: 'experienced',
    skills: ['Digital Marketing', 'Social Media', 'Content Creation', 'SEO', 'Analytics'],
    salary: '$50,000 - $70,000',
    rate: 'Annually',
    vacancy: '1',
    location: 'Austin, TX',
    qualifications: 'Marketing degree or equivalent experience, 2+ years in digital marketing',
    applications_instructions: 'Include samples of your marketing work.',
    status: 'inactive'
  }
];

function generateJobUniqueId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `job-${timestamp}-${random}`;
}

async function createJobsForUser() {
  try {
    console.log('🚀 Starting job creation script...\n');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || process.env.DB_URL);
    console.log('✅ Connected to MongoDB\n');

    // Find user
    const user = await User.findOne({ email: USER_EMAIL });
    
    if (!user) {
      console.error(`❌ User not found with email: ${USER_EMAIL}`);
      console.log('Please provide a valid user email as argument:');
      console.log('  node scripts/createJobsForUser.js user@example.com');
      process.exit(1);
    }

    console.log('✅ User found:');
    console.log(`   ID: ${user._id.toString()}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name: ${user.full_name}`);
    console.log(`   User Type: ${user.user_type.join(', ')}\n`);

    // Check if user has recruiter role
    if (!user.user_type.includes('recruiter') && !user.user_type.includes('company')) {
      console.log('⚠️  Warning: User does not have recruiter or company role');
      console.log('   Jobs will still be created, but user may not see them in dashboard\n');
    }

    // Create 5 jobs with different statuses
    const createdJobs = [];
    
    for (let i = 0; i < jobTemplates.length; i++) {
      const template = jobTemplates[i];
      const status = JOB_STATUSES[i % JOB_STATUSES.length]; // Cycle through statuses
      
      const jobData = {
        job_unique_id: generateJobUniqueId(),
        company_id: user._id,
        job_title: template.job_title,
        job_type: template.job_type,
        job_location_type: template.job_location_type,
        job_description: template.job_description,
        responsibility: template.responsibility,
        experience: template.experience,
        experience_type: template.experience_type,
        skills: template.skills,
        salary: template.salary,
        rate: template.rate,
        vacancy: template.vacancy,
        location: template.location,
        qualifications: template.qualifications,
        applications_instructions: template.applications_instructions,
        status: status,
        created_by: 'company',
        company_description: user.company_data?.name || `${user.full_name}'s Company`,
        email: user.email,
        phone_number: user.phone_number,
        office_address: user.company_data?.address || {
          address_line_1: '123 Main Street',
          city: 'New York',
          state: 'NY',
          country: 'United States',
          pincode: '10001'
        },
        advertise: {
          status: 'yes',
          city: template.location.split(',')[0] || 'New York'
        },
        planned_start_date: {
          status: 'yes',
          date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
        },
        application_last_date: {
          status: 'yes',
          date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
        }
      };

      try {
        const job = await Job.create(jobData);
        createdJobs.push(job);
        console.log(`✅ Created job ${i + 1}: ${job.job_title}`);
        console.log(`   Job ID: ${job.job_unique_id}`);
        console.log(`   Status: ${job.status}`);
        console.log(`   Location: ${job.location}\n`);
      } catch (error) {
        console.error(`❌ Error creating job ${i + 1} (${template.job_title}):`, error.message);
      }
    }

    console.log('\n📋 Summary:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Successfully created ${createdJobs.length} jobs for user: ${user.email}`);
    console.log(`\n📊 Status Distribution:`);
    const statusCount = {};
    createdJobs.forEach(job => {
      statusCount[job.status] = (statusCount[job.status] || 0) + 1;
    });
    Object.entries(statusCount).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✨ Jobs are now available in the dashboard!');
    console.log(`   Login to frontend and check: http://localhost:3000/my-account`);
    console.log(`   Navigate to "My Job Posted" tab to see the jobs\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('👋 Database connection closed');
    process.exit(0);
  }
}

createJobsForUser();

