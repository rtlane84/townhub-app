require 'json'

package = JSON.parse(File.read(File.join(__dir__, 'package.json')))

Pod::Spec.new do |s|
  # Capacitor derives this from @townhub/capacitor-auth-session
  s.name = 'TownhubCapacitorAuthSession'
  s.version = package['version']
  s.summary = package['description']
  s.license = package['license']
  s.homepage = 'https://townhub.io'
  s.author = package['author']
  s.source = { :git => 'https://github.com/rtlane84/townhub-app.git', :tag => 'v' + package['version'] }
  s.source_files = 'ios/Sources/**/*.{swift,h,m,c,cc,mm,cpp}'
  s.ios.deployment_target = '14.0'
  s.dependency 'Capacitor'
  s.swift_version = '5.1'
  s.frameworks = 'AuthenticationServices'
end
